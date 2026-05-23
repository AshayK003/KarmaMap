-- KarmaMap initial schema: PostGIS, tables, RLS, storage
--
-- IMPORTANT: Enable "postgis" under Database → Extensions FIRST, then run this file.
-- On Supabase, PostGIS lives in the "extensions" schema (not "public").

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Custom types
CREATE TYPE user_role AS ENUM ('volunteer', 'ngo');
CREATE TYPE gig_status AS ENUM ('open', 'in_progress', 'completed', 'cancelled');
CREATE TYPE participation_status AS ENUM ('pending', 'joined', 'checked_in', 'completed', 'cancelled');

-- Profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  name TEXT NOT NULL,
  skills TEXT[] DEFAULT '{}',
  karma_points INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  location GEOGRAPHY(POINT, 4326),
  bio TEXT,
  portfolio_slug TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX profiles_location_idx ON public.profiles USING GIST (location);
CREATE INDEX profiles_role_idx ON public.profiles (role);

-- Gigs
CREATE TABLE public.gigs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  ngo_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location GEOGRAPHY(POINT, 4326) NOT NULL,
  required_skills TEXT[] DEFAULT '{}',
  volunteers_needed INTEGER NOT NULL DEFAULT 1,
  volunteers_joined INTEGER NOT NULL DEFAULT 0,
  gig_date TIMESTAMPTZ NOT NULL,
  status gig_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX gigs_location_idx ON public.gigs USING GIST (location);
CREATE INDEX gigs_ngo_id_idx ON public.gigs (ngo_id);
CREATE INDEX gigs_status_idx ON public.gigs (status);

-- Participations
CREATE TABLE public.participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gig_id UUID NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  status participation_status NOT NULL DEFAULT 'pending',
  before_photo_url TEXT,
  after_photo_url TEXT,
  hours NUMERIC(6,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (volunteer_id, gig_id)
);

CREATE INDEX participations_volunteer_idx ON public.participations (volunteer_id);
CREATE INDEX participations_gig_idx ON public.participations (gig_id);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  read_status BOOLEAN NOT NULL DEFAULT FALSE,
  gig_id UUID REFERENCES public.gigs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_idx ON public.notifications (user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name, skills)
  VALUES (
    NEW.id,
    COALESCE(
      (NEW.raw_app_meta_data->>'role')::user_role,
      (NEW.raw_user_meta_data->>'role')::user_role,
      'volunteer'
    ),
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'skills')),
      '{}'
    )
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER gigs_updated_at BEFORE UPDATE ON public.gigs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER participations_updated_at BEFORE UPDATE ON public.participations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Increment gig volunteer count
CREATE OR REPLACE FUNCTION public.increment_gig_volunteers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.status = 'joined' AND (OLD IS NULL OR OLD.status = 'pending') THEN
    UPDATE public.gigs SET volunteers_joined = volunteers_joined + 1 WHERE id = NEW.gig_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_participation_joined
  AFTER INSERT OR UPDATE ON public.participations
  FOR EACH ROW EXECUTE FUNCTION public.increment_gig_volunteers();

-- Nearby gigs RPC (for map)
CREATE OR REPLACE FUNCTION public.nearby_gigs(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 10000
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  ngo_id UUID,
  ngo_name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  required_skills TEXT[],
  volunteers_needed INTEGER,
  volunteers_joined INTEGER,
  gig_date TIMESTAMPTZ,
  status gig_status,
  distance_meters DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    g.id,
    g.title,
    g.description,
    g.ngo_id,
    p.name AS ngo_name,
    ST_Y(g.location::extensions.geometry) AS lat,
    ST_X(g.location::extensions.geometry) AS lng,
    g.required_skills,
    g.volunteers_needed,
    g.volunteers_joined,
    g.gig_date,
    g.status,
    ST_Distance(
      g.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
    ) AS distance_meters
  FROM public.gigs g
  JOIN public.profiles p ON p.id = g.ngo_id
  WHERE g.status = 'open'
    AND ST_DWithin(
      g.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC;
$$;

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Public portfolios are viewable"
  ON public.profiles FOR SELECT TO anon
  USING (portfolio_slug IS NOT NULL);

CREATE POLICY "Public completed participations viewable"
  ON public.participations FOR SELECT TO anon
  USING (
    status = 'completed'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = volunteer_id AND p.portfolio_slug IS NOT NULL
    )
  );

-- Gigs policies
CREATE POLICY "Open gigs are viewable by authenticated"
  ON public.gigs FOR SELECT TO authenticated USING (true);

CREATE POLICY "NGOs can insert own gigs"
  ON public.gigs FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = ngo_id
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'ngo')
  );

CREATE POLICY "NGOs can update own gigs"
  ON public.gigs FOR UPDATE TO authenticated
  USING (auth.uid() = ngo_id) WITH CHECK (auth.uid() = ngo_id);

CREATE POLICY "NGOs can delete own gigs"
  ON public.gigs FOR DELETE TO authenticated
  USING (auth.uid() = ngo_id);

-- Participations policies
CREATE POLICY "Users can view relevant participations"
  ON public.participations FOR SELECT TO authenticated
  USING (
    volunteer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.gigs g
      WHERE g.id = gig_id AND g.ngo_id = auth.uid()
    )
  );

CREATE POLICY "Volunteers can insert own participations"
  ON public.participations FOR INSERT TO authenticated
  WITH CHECK (
    volunteer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'volunteer')
  );

CREATE POLICY "Volunteers can update own participations"
  ON public.participations FOR UPDATE TO authenticated
  USING (volunteer_id = auth.uid()) WITH CHECK (volunteer_id = auth.uid());

-- Notifications policies
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Storage: create bucket in Dashboard first (Storage → New bucket):
--   Name: participation-photos  |  Public: ON
-- Then run: supabase/migrations/storage_policies.sql

-- Insert gig with lat/lng (used by backend)
CREATE OR REPLACE FUNCTION public.insert_gig(
  p_title TEXT,
  p_description TEXT,
  p_ngo_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_required_skills TEXT[],
  p_volunteers_needed INTEGER,
  p_gig_date TIMESTAMPTZ
)
RETURNS public.gigs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  new_gig public.gigs;
BEGIN
  INSERT INTO public.gigs (
    title, description, ngo_id, location,
    required_skills, volunteers_needed, gig_date
  ) VALUES (
    p_title, p_description, p_ngo_id,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_required_skills, p_volunteers_needed, p_gig_date
  )
  RETURNING * INTO new_gig;
  RETURN new_gig;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_gig TO service_role;

-- Helper: set profile location
CREATE OR REPLACE FUNCTION public.update_profile_location(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  UPDATE public.profiles
  SET location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
  WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.update_profile_location TO authenticated;
GRANT EXECUTE ON FUNCTION public.nearby_gigs TO authenticated;

-- Match volunteers for a gig (backend matching engine)
CREATE OR REPLACE FUNCTION public.nearby_volunteers_for_gig(
  p_gig_id UUID,
  p_radius_meters DOUBLE PRECISION DEFAULT 10000
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  skills TEXT[],
  distance_meters DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    pr.id,
    pr.name,
    pr.skills,
    ST_Distance(
      pr.location,
      g.location
    ) AS distance_meters
  FROM public.profiles pr
  CROSS JOIN public.gigs g
  WHERE g.id = p_gig_id
    AND pr.role = 'volunteer'
    AND pr.location IS NOT NULL
    AND ST_DWithin(pr.location, g.location, p_radius_meters)
  ORDER BY distance_meters ASC;
$$;

CREATE OR REPLACE FUNCTION public.match_volunteers_for_gig(
  p_gig_id UUID,
  p_radius_meters DOUBLE PRECISION DEFAULT 10000
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  skills TEXT[],
  distance_meters DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    nv.id,
    nv.name,
    ''::TEXT AS email,
    nv.skills,
    nv.distance_meters
  FROM public.nearby_volunteers_for_gig(p_gig_id, p_radius_meters) nv;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_volunteers_for_gig TO service_role;
GRANT EXECUTE ON FUNCTION public.match_volunteers_for_gig TO service_role;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.gigs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

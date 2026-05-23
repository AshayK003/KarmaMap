-- STEP 2: Run AFTER 00_schema_core.sql succeeds

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
    ST_Distance(pr.location, g.location) AS distance_meters
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

ALTER PUBLICATION supabase_realtime ADD TABLE public.gigs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

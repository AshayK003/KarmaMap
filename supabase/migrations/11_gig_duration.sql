-- ==========================================
-- PART 1: Add column (run this first)
-- ==========================================
ALTER TABLE public.gigs ADD COLUMN IF NOT EXISTS duration INTEGER;

-- ==========================================
-- PART 2: Recreate insert_gig (run this second)
-- ==========================================
DROP FUNCTION IF EXISTS public.insert_gig(p_title TEXT, p_description TEXT, p_ngo_id UUID, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION, p_required_skills TEXT[], p_volunteers_needed INTEGER, p_gig_date TIMESTAMPTZ, p_location_label TEXT);

CREATE OR REPLACE FUNCTION public.insert_gig(
  p_title TEXT,
  p_description TEXT,
  p_ngo_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_required_skills TEXT[],
  p_volunteers_needed INTEGER,
  p_gig_date TIMESTAMPTZ,
  p_location_label TEXT DEFAULT '',
  p_duration INTEGER DEFAULT NULL
)
RETURNS public.gigs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $func$
DECLARE
  new_gig public.gigs;
BEGIN
  INSERT INTO public.gigs (
    title, description, ngo_id, location,
    required_skills, volunteers_needed, gig_date, location_label,
    duration
  ) VALUES (
    p_title, p_description, p_ngo_id,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_required_skills, p_volunteers_needed, p_gig_date,
    NULLIF(p_location_label, ''),
    p_duration
  )
  RETURNING * INTO new_gig;
  RETURN new_gig;
END;
$func$;

GRANT EXECUTE ON FUNCTION public.insert_gig TO service_role;

-- ==========================================
-- PART 3: Recreate nearby_gigs (run this third)
-- NOTE: Only adds duration — your DB doesn't have featured_until yet
-- ==========================================
DROP FUNCTION IF EXISTS public.nearby_gigs(lat DOUBLE PRECISION, lng DOUBLE PRECISION, radius_meters DOUBLE PRECISION);

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
  distance_meters DOUBLE PRECISION,
  duration INTEGER
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $func$
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
    ) AS distance_meters,
    g.duration
  FROM public.gigs g
  JOIN public.profiles p ON p.id = g.ngo_id
  WHERE g.status = 'open'
    AND ST_DWithin(
      g.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC
$func$;

GRANT EXECUTE ON FUNCTION public.nearby_gigs TO authenticated;

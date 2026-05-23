-- PREREQUISITE: public.profiles must exist!
-- If you see "relation public.profiles does not exist", run FIRST:
--   supabase/migrations/00_schema_core.sql
-- or the full 20240523000000_initial_schema.sql
--
-- Run this ONLY if you hit: could not find a function named "public.nearby_volunteers_for_gig"

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE EXCEPTION 'Missing public.profiles — run 00_schema_core.sql before this file.';
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

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

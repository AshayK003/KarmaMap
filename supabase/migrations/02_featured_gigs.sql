-- Run after 01_functions_and_realtime.sql
-- Adds featured gigs support (NGOs can pay to pin gigs at top of discovery)

ALTER TABLE public.gigs
ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS gigs_featured_until_idx ON public.gigs (featured_until DESC);

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
  featured_until TIMESTAMPTZ
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
    ) AS distance_meters,
    g.featured_until
  FROM public.gigs g
  JOIN public.profiles p ON p.id = g.ngo_id
  WHERE g.status = 'open'
    AND ST_DWithin(
      g.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_meters
    )
  ORDER BY
    CASE WHEN g.featured_until IS NOT NULL AND g.featured_until > NOW() THEN 0 ELSE 1 END ASC,
    distance_meters ASC;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_gigs TO authenticated;

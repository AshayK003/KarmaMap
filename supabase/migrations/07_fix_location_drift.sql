DROP FUNCTION IF EXISTS public.update_gig(p_gig_id UUID, p_title TEXT, p_description TEXT, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION, p_required_skills TEXT[], p_volunteers_needed INTEGER, p_gig_date TIMESTAMPTZ, p_location_label TEXT);

CREATE OR REPLACE FUNCTION public.update_gig(
  p_gig_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_required_skills TEXT[],
  p_volunteers_needed INTEGER,
  p_gig_date TIMESTAMPTZ,
  p_location_label TEXT DEFAULT NULL
)
RETURNS SETOF public.gigs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  UPDATE public.gigs SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    location = CASE
      WHEN ST_X(location::extensions.geometry) IS DISTINCT FROM p_lng
        OR ST_Y(location::extensions.geometry) IS DISTINCT FROM p_lat
      THEN ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ELSE location
    END,
    required_skills = COALESCE(p_required_skills, required_skills),
    volunteers_needed = COALESCE(p_volunteers_needed, volunteers_needed),
    gig_date = COALESCE(p_gig_date, gig_date),
    location_label = COALESCE(p_location_label, location_label)
  WHERE id = p_gig_id
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_gig TO service_role;

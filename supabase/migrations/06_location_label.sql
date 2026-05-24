ALTER TABLE public.gigs
ADD COLUMN IF NOT EXISTS location_label TEXT;

DROP FUNCTION IF EXISTS public.insert_gig(p_title TEXT, p_description TEXT, p_ngo_id UUID, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION, p_required_skills TEXT[], p_volunteers_needed INTEGER, p_gig_date TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.insert_gig(
  p_title TEXT,
  p_description TEXT,
  p_ngo_id UUID,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_required_skills TEXT[],
  p_volunteers_needed INTEGER,
  p_gig_date TIMESTAMPTZ,
  p_location_label TEXT DEFAULT ''
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
    required_skills, volunteers_needed, gig_date, location_label
  ) VALUES (
    p_title, p_description, p_ngo_id,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_required_skills, p_volunteers_needed, p_gig_date,
    NULLIF(p_location_label, '')
  )
  RETURNING * INTO new_gig;
  RETURN new_gig;
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_gig TO service_role;

DROP FUNCTION IF EXISTS public.update_gig(p_gig_id UUID, p_title TEXT, p_description TEXT, p_lat DOUBLE PRECISION, p_lng DOUBLE PRECISION, p_required_skills TEXT[], p_volunteers_needed INTEGER, p_gig_date TIMESTAMPTZ);

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
    title = p_title,
    description = p_description,
    location = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    required_skills = p_required_skills,
    volunteers_needed = p_volunteers_needed,
    gig_date = p_gig_date,
    location_label = COALESCE(p_location_label, location_label)
  WHERE id = p_gig_id
  RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_gig TO service_role;

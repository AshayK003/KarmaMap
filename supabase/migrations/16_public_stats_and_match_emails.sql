-- Public landing-page stats: one SECURITY DEFINER aggregate callable by anon,
-- so the homepage shows real counts without opening broad table policies.
--
-- Also: match emails were silently never sent because the volunteer-matching
-- RPC returned no email column. nearby_volunteers_for_gig now returns email
-- (service-role only, so addresses are not exposed to clients).

CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT JSON_BUILD_OBJECT(
    'total_hours', (
      SELECT COALESCE(SUM(p.hours), 0)
      FROM public.participations p
      WHERE p.status = 'completed'
    ),
    'ngo_count', (
      SELECT COUNT(*) FROM public.profiles pr WHERE pr.role = 'ngo'
    ),
    'open_gigs', (
      SELECT COUNT(*) FROM public.gigs g WHERE g.status = 'open'
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_public_stats TO anon, authenticated;

DROP FUNCTION IF EXISTS public.nearby_volunteers_for_gig(UUID, DOUBLE PRECISION);

CREATE OR REPLACE FUNCTION public.nearby_volunteers_for_gig(
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
    pr.id,
    pr.name,
    COALESCE(pr_user.email, '') AS email,
    pr.skills,
    ST_Distance(pr.location, g.location) AS distance_meters
  FROM public.profiles pr
  JOIN public.gigs g ON g.id = p_gig_id
  LEFT JOIN auth.users pr_user ON pr_user.id = pr.id
  WHERE pr.role = 'volunteer'
    AND pr.location IS NOT NULL
    AND ST_DWithin(pr.location, g.location, p_radius_meters)
  ORDER BY distance_meters ASC;
$$;

GRANT EXECUTE ON FUNCTION public.nearby_volunteers_for_gig TO service_role;

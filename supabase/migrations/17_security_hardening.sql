-- 17_security_hardening.sql — run after 16 on any environment.
--
-- Closes audit findings without changing any legitimate flow (all app writes
-- go through the service_role backend; all app reads keep their grants):
--
--  1. award_karma() was PUBLIC-executable with no validation: anyone could
--     self-award arbitrary/negative karma, bypassing complete_participation.
--     Now validates hours and is service_role-only.
--  2. join_gig / complete_participation / insert_gig / update_gig / get_ngo_analytics
--     only GRANTed to service_role but never REVOKEd from PUBLIC, so anon and
--     authenticated callers could still execute them. Now revoked.
--     get_ngo_analytics additionally becomes SECURITY DEFINER so it keeps
--     working for the backend while staying closed to direct callers.
--  3. nearby_gigs lost featured_until when 11 recreated the 02 definition.
--     Merged definition returns BOTH featured_until and duration with
--     featured-first ordering. Grants unchanged (authenticated discovery).
--  4. payments.gig_id was NOT NULL with ON DELETE SET NULL — deleting a gig
--     errored. Now nullable.
--  5. Direct participations INSERT/UPDATE bypassed the atomic join/complete
--     RPCs (capacity overflow, self-completion without karma). Direct inserts
--     are now pending-only; direct updates can never set 'completed'
--     (completion stays exclusively inside complete_participation).
--  6. Storage UPDATE policies had USING but no WITH CHECK, allowing moves
--     outside the owner's folder. Now pinned on both clauses.

-- ---------------------------------------------------------------------------
-- 1. award_karma: validate + lock down
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.award_karma(
  p_user_id UUID,
  p_hours NUMERIC
)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  v_earned INTEGER;
BEGIN
  -- Matches the completeParticipation API contract (0.5–24h). NULL, zero,
  -- negative, and absurd values previously drained or overflowed karma.
  IF p_hours IS NULL OR p_hours < 0.5 OR p_hours > 24 THEN
    RAISE EXCEPTION 'Invalid hours for karma award' USING ERRCODE = '23514';
  END IF;

  v_earned := round(p_hours * 10)::INTEGER;

  UPDATE public.profiles
  SET
    karma_points = COALESCE(karma_points, 0) + v_earned,
    streak = COALESCE(streak, 0) + 1
  WHERE id = p_user_id;

  RETURN v_earned;
END;
$$;

REVOKE ALL ON FUNCTION public.award_karma(UUID, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_karma(UUID, NUMERIC) TO service_role;

-- ---------------------------------------------------------------------------
-- 2. Revoke PUBLIC execute on service-role-only RPCs
--    (GRANT alone never removes the default PUBLIC execute privilege.)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.join_gig(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_gig(UUID, UUID) TO service_role;

-- Returns volunteer emails: must never stay PUBLIC-executable.
REVOKE ALL ON FUNCTION public.nearby_volunteers_for_gig(UUID, DOUBLE PRECISION) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.nearby_volunteers_for_gig(UUID, DOUBLE PRECISION) TO service_role;

REVOKE ALL ON FUNCTION public.complete_participation(UUID, UUID, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_participation(UUID, UUID, NUMERIC, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.insert_gig(TEXT, TEXT, UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], INTEGER, TIMESTAMPTZ, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_gig(TEXT, TEXT, UUID, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], INTEGER, TIMESTAMPTZ, TEXT, INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.update_gig(UUID, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], INTEGER, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_gig(UUID, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], INTEGER, TIMESTAMPTZ, TEXT) TO service_role;

-- get_ngo_analytics had no grant and no definer: lock to the backend.
CREATE OR REPLACE FUNCTION public.get_ngo_analytics(p_ngo_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  WITH gig_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_gigs,
      COUNT(*) AS total_gigs,
      ARRAY_AGG(id) AS gig_ids
    FROM public.gigs
    WHERE ngo_id = p_ngo_id
  ),
  hours_stats AS (
    SELECT COALESCE(SUM(p.hours) FILTER (WHERE p.status = 'completed'), 0) AS total_hours
    FROM public.participations p
    JOIN public.gigs g ON g.id = p.gig_id
    WHERE g.ngo_id = p_ngo_id
  ),
  chart_data AS (
    SELECT COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'name', LEFT(title, 20),
          'volunteers', volunteers_joined,
          'completed', CASE WHEN status = 'completed' THEN 1 ELSE 0 END
        )
        ORDER BY gig_date DESC
      ),
      '[]'::JSON
    ) AS data
    FROM public.gigs
    WHERE ngo_id = p_ngo_id
  )
  SELECT JSON_BUILD_OBJECT(
    'total_hours', (SELECT total_hours FROM hours_stats),
    'completed_gigs', (SELECT completed_gigs FROM gig_stats),
    'total_gigs', (SELECT total_gigs FROM gig_stats),
    'chart_data', (SELECT data FROM chart_data)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_ngo_analytics(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ngo_analytics(UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. nearby_gigs: restore featured_until (lost in 11) alongside duration
-- ---------------------------------------------------------------------------

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
  featured_until TIMESTAMPTZ,
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
    g.featured_until,
    g.duration
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
    distance_meters ASC
$func$;

GRANT EXECUTE ON FUNCTION public.nearby_gigs TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. payments.gig_id: allow the ON DELETE SET NULL to actually work
-- ---------------------------------------------------------------------------

ALTER TABLE public.payments ALTER COLUMN gig_id DROP NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. participations: force joins/completions through the atomic RPCs
--    (RPCs run as definer/service_role and bypass these policies.)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Volunteers can insert own participations" ON public.participations;

CREATE POLICY "Volunteers can insert own participations"
  ON public.participations FOR INSERT TO authenticated
  WITH CHECK (
    volunteer_id = auth.uid()
    AND status = 'pending'
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'volunteer')
  );

DROP POLICY IF EXISTS "Volunteers can update own participations" ON public.participations;

CREATE POLICY "Volunteers can update own participations"
  ON public.participations FOR UPDATE TO authenticated
  USING (volunteer_id = auth.uid())
  WITH CHECK (
    volunteer_id = auth.uid()
    -- 'completed' is awarded exclusively inside complete_participation();
    -- direct writes could fake portfolios/stats without earning karma.
    AND status IN ('pending', 'joined', 'checked_in', 'cancelled')
  );

-- ---------------------------------------------------------------------------
-- 6. Storage UPDATE: pin the new row to the owner's folder too
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users can update own photos" ON storage.objects;

CREATE POLICY "Users can update own photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'participation-photos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'participation-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "NGOs can update own QR codes" ON storage.objects;

CREATE POLICY "NGOs can update own QR codes"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ngo-qr-codes' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'ngo-qr-codes' AND auth.uid()::text = (storage.foldername(name))[1]);

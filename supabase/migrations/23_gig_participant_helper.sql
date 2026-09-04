-- 23_gig_participant_helper.sql — break the gigs/participations policy cycle.
--
-- Migration 22 referenced participations inside the gigs SELECT policy, but
-- the participations SELECT policy references gigs back: mutual recursion
-- rejects every gig read. The check moves into a SECURITY DEFINER helper
-- (bypasses RLS, so no cycle) while auth.uid() still reflects the caller.

CREATE OR REPLACE FUNCTION public.is_gig_participant(p_gig_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.participations
    WHERE gig_id = p_gig_id AND volunteer_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_gig_participant(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_gig_participant(UUID) TO authenticated;

DROP POLICY IF EXISTS "Open gigs are viewable by authenticated" ON public.gigs;

CREATE POLICY "Open gigs are viewable by authenticated"
  ON public.gigs FOR SELECT TO authenticated
  USING (
    status = 'open'
    OR auth.uid() = ngo_id
    OR public.is_gig_participant(id)
  );

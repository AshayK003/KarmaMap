-- 21_open_gigs_policy.sql — stop exposing non-open gigs to every login.
--
-- The original "Open gigs are viewable by authenticated" policy used
-- USING (true), so direct PostgREST reads returned cancelled, completed,
-- and in-progress gigs too. Only the nearby_gigs RPC filtered correctly.
-- Now volunteers see open gigs; NGOs keep full read access to their own.

DROP POLICY IF EXISTS "Open gigs are viewable by authenticated" ON public.gigs;

CREATE POLICY "Open gigs are viewable by authenticated"
  ON public.gigs FOR SELECT TO authenticated
  USING (status = 'open' OR auth.uid() = ngo_id);

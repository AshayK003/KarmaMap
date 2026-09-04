-- 22_gig_participant_read.sql — volunteers can read gigs they joined.
--
-- Migration 21 hid every non-open gig from volunteers, which also hid the
-- volunteer's OWN in-progress gigs: portfolio titles fell back to a
-- placeholder and detail pages broke. Participation is proof of relationship,
-- so members of a gig can always read it regardless of status.

DROP POLICY IF EXISTS "Open gigs are viewable by authenticated" ON public.gigs;

CREATE POLICY "Open gigs are viewable by authenticated"
  ON public.gigs FOR SELECT TO authenticated
  USING (
    status = 'open'
    OR auth.uid() = ngo_id
    OR EXISTS (
      SELECT 1 FROM public.participations p
      WHERE p.gig_id = gigs.id AND p.volunteer_id = auth.uid()
    )
  );

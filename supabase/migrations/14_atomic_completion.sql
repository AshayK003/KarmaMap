-- Atomic gig completion: verifies status, updates the participation, and awards
-- karma inside a single SQL transaction.
--
-- Previously the service layer fetched, awarded karma, THEN updated the row.
-- A failed update after a successful award double-paid karma; there was also no
-- status guard, so pending/cancelled participations could be "completed".

CREATE OR REPLACE FUNCTION public.complete_participation(
  p_participation_id UUID,
  p_volunteer_id UUID,
  p_hours NUMERIC,
  p_before_photo_url TEXT DEFAULT NULL,
  p_after_photo_url TEXT DEFAULT NULL
)
RETURNS public.participations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gig_status gig_status;
  v_updated public.participations;
BEGIN
  -- The gig must be in progress or completed for hours to count.
  SELECT g.status INTO v_gig_status
  FROM public.participations p
  JOIN public.gigs g ON g.id = p.gig_id
  WHERE p.id = p_participation_id AND p.volunteer_id = p_volunteer_id;

  IF v_gig_status IS NULL THEN
    RAISE EXCEPTION 'Participation not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_gig_status NOT IN ('in_progress', 'completed') THEN
    RAISE EXCEPTION 'This gig has not started yet' USING ERRCODE = '23514';
  END IF;

  UPDATE public.participations
  SET status = 'completed',
      hours = p_hours,
      before_photo_url = COALESCE(p_before_photo_url, before_photo_url),
      after_photo_url = COALESCE(p_after_photo_url, after_photo_url)
  WHERE id = p_participation_id
    AND volunteer_id = p_volunteer_id
    AND status = 'joined'
  RETURNING * INTO v_updated;

  IF v_updated.id IS NULL THEN
    RAISE EXCEPTION 'Participation not found or already completed' USING ERRCODE = 'P0002';
  END IF;

  PERFORM public.award_karma(p_volunteer_id, p_hours);

  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_participation TO service_role;

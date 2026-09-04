-- 25_leave_participation.sql — single-writer volunteer leave path.
--
-- Leaving a gig previously had no RPC: the counter was decremented only by
-- the increment/decrement trigger, with no row lock and no state guard, so
-- concurrent cancel/rejoin cycles could drift volunteers_joined. This
-- function mirrors join_gig's single-writer pattern: lock the gig row,
-- move the participation to cancelled only from an occupying state, and
-- decrement the counter in the same transaction with the trigger silenced.
-- join_gig's rejoin logic already expects trigger-decremented cancels, and
-- a trigger-silenced manual decrement keeps that invariant exact.

CREATE OR REPLACE FUNCTION public.leave_participation(
  p_participation_id UUID,
  p_volunteer_id UUID
)
RETURNS public.participations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_participation public.participations;
  v_occupied BOOLEAN;
BEGIN
  SELECT * INTO v_participation
  FROM public.participations
  WHERE id = p_participation_id
  FOR UPDATE;

  IF v_participation.id IS NULL OR v_participation.volunteer_id <> p_volunteer_id THEN
    RAISE EXCEPTION 'Participation not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_participation.status = 'cancelled' THEN
    RAISE EXCEPTION 'Participation already cancelled' USING ERRCODE = '23505';
  END IF;

  IF v_participation.status = 'completed' THEN
    RAISE EXCEPTION 'Completed participations cannot be cancelled' USING ERRCODE = '23514';
  END IF;

  -- Only joined/checked_in rows occupy a spot (pending never incremented it).
  v_occupied := v_participation.status IN ('joined', 'checked_in');

  -- Same single-writer protocol as join_gig: silence the counter trigger and
  -- move the counter ourselves inside the locked transaction.
  PERFORM set_config('app.suppress_join_trigger', 'on', true);

  UPDATE public.participations
  SET status = 'cancelled'
  WHERE id = p_participation_id
  RETURNING * INTO v_participation;

  IF v_occupied THEN
    UPDATE public.gigs
    SET volunteers_joined = GREATEST(volunteers_joined - 1, 0)
    WHERE id = v_participation.gig_id;
  END IF;

  RETURN v_participation;
END;
$$;

REVOKE ALL ON FUNCTION public.leave_participation(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_participation(UUID, UUID) TO service_role;

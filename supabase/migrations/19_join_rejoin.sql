-- 19_join_rejoin.sql — let volunteers rejoin after cancelling.
--
-- join_gig's ON CONFLICT DO NOTHING treated a cancelled row as "already
-- joined" forever: the unique key (volunteer_id, gig_id) fired, nothing
-- returned, and the user was locked out of the gig. Now a conflict against
-- a cancelled row reactivates it; conflicts against live rows still raise.

CREATE OR REPLACE FUNCTION public.join_gig(
  p_gig_id UUID,
  p_volunteer_id UUID
)
RETURNS public.participations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gig public.gigs;
  v_participation public.participations;
BEGIN
  SELECT * INTO v_gig FROM public.gigs WHERE id = p_gig_id FOR UPDATE;

  IF v_gig.id IS NULL THEN
    RAISE EXCEPTION 'Gig not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_gig.status NOT IN ('open', 'in_progress') THEN
    RAISE EXCEPTION 'This gig is no longer accepting volunteers' USING ERRCODE = '23514';
  END IF;

  IF v_gig.volunteers_joined >= v_gig.volunteers_needed THEN
    RAISE EXCEPTION 'This gig is full' USING ERRCODE = '23514';
  END IF;

  -- Tell the increment trigger to stand down: this function updates the
  -- counter itself, inside the same locked transaction.
  PERFORM set_config('app.suppress_join_trigger', 'on', true);

  INSERT INTO public.participations (volunteer_id, gig_id, status)
  VALUES (p_volunteer_id, p_gig_id, 'joined')
  ON CONFLICT (volunteer_id, gig_id)
  DO UPDATE SET status = 'joined', hours = 0
  WHERE participations.status = 'cancelled'
  RETURNING * INTO v_participation;

  IF v_participation.id IS NULL THEN
    RAISE EXCEPTION 'You have already joined this gig.' USING ERRCODE = '23505';
  END IF;

  -- A reactivated row was already counted once, but the cancel path
  -- decremented the counter through the trigger — so every successful
  -- join here, fresh or reactivated, adds exactly one back.
  UPDATE public.gigs
  SET volunteers_joined = volunteers_joined + 1
  WHERE id = p_gig_id;

  RETURN v_participation;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_gig(UUID, UUID) TO service_role;

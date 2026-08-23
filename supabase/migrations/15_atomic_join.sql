-- Atomic gig joining: capacity check + insert + counter increment happen inside
-- one SQL statement, closing the race where concurrent joins could overflow a
-- gig's capacity (the JS-side check-then-act in the service layer was not safe,
-- and the increment trigger incremented blindly).
--
-- The trigger is kept for legacy rows but neutered for RPC-created joins by
-- making it conditional on a session GUC set inside this function.

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
  DO NOTHING
  RETURNING * INTO v_participation;

  IF v_participation.id IS NULL THEN
    RAISE EXCEPTION 'You have already joined this gig.' USING ERRCODE = '23505';
  END IF;

  UPDATE public.gigs
  SET volunteers_joined = volunteers_joined + 1
  WHERE id = p_gig_id;

  RETURN v_participation;
END;
$$;

GRANT EXECUTE ON FUNCTION public.join_gig TO service_role;

-- Make the legacy increment trigger respect the suppression flag so counts are
-- never double-incremented when joins go through join_gig().
CREATE OR REPLACE FUNCTION public.increment_gig_volunteers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF coalesce(current_setting('app.suppress_join_trigger', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'joined' AND (OLD IS NULL OR OLD.status = 'pending') THEN
    UPDATE public.gigs SET volunteers_joined = volunteers_joined + 1 WHERE id = NEW.gig_id;
  ELSIF NEW.status = 'cancelled' AND OLD.status = 'joined' THEN
    UPDATE public.gigs SET volunteers_joined = GREATEST(volunteers_joined - 1, 0) WHERE id = NEW.gig_id;
  END IF;
  RETURN NEW;
END;
$$;

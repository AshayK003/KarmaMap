-- 18_gig_status_guard.sql — enforce the gig lifecycle in the database.
--
-- The NGO dashboard moves gigs open → in_progress → completed (cancelled ↔ open
-- for closes/reopens). Direct PostgREST writes could previously jump anywhere
-- (e.g. completed → open, resurrecting finished gigs). This trigger rejects
-- illegal transitions for client roles. Backend code runs as postgres (inside
-- security definer functions) or service_role, both of which are exempt — the
-- API layer enforces the same map and returns 409s with a clear message.

CREATE OR REPLACE FUNCTION public.guard_gig_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'open' AND NEW.status IN ('in_progress', 'cancelled'))
      OR (OLD.status = 'in_progress' AND NEW.status IN ('completed', 'cancelled'))
      OR (OLD.status = 'cancelled' AND NEW.status = 'open')
    ) THEN
      IF current_user NOT IN ('postgres', 'service_role') THEN
        RAISE EXCEPTION 'Illegal gig status transition from % to %', OLD.status, NEW.status
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gigs_guard_status ON public.gigs;
CREATE TRIGGER gigs_guard_status
  BEFORE UPDATE ON public.gigs
  FOR EACH ROW EXECUTE FUNCTION public.guard_gig_status();

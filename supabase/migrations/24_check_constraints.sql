-- 24_check_constraints.sql — guard numeric ranges at the database level.
--
-- All constraints are added NOT VALID: they enforce on every new write from
-- this point on, but never fail the migration on historical rows. A future
-- maintenance window can run ALTER TABLE ... VALIDATE CONSTRAINT once old
-- rows are cleaned.
--
-- Deliberately NOT constrained: gigs.gig_date has no "must be future" check
-- because completed/cancelled gigs legitimately carry past dates. Futurity
-- is enforced at creation time only (backend createGigSchema), which is the
-- correct layer for a property that is true at insert but false later.

ALTER TABLE public.gigs
  ADD CONSTRAINT gigs_volunteers_needed_check
  CHECK (volunteers_needed >= 1) NOT VALID;

ALTER TABLE public.gigs
  ADD CONSTRAINT gigs_volunteers_joined_check
  CHECK (volunteers_joined >= 0 AND volunteers_joined <= volunteers_needed) NOT VALID;

-- Featured pins cost money (payments.feature_hours); cap self-pinning at the
-- maximum purchasable window (720h = 30 days, see backend MAX_FEATURE_HOURS).
ALTER TABLE public.gigs
  ADD CONSTRAINT gigs_featured_cap_check
  CHECK (featured_until IS NULL OR featured_until <= created_at + interval '30 days') NOT VALID;

ALTER TABLE public.payments
  ADD CONSTRAINT payments_amount_check
  CHECK (amount > 0) NOT VALID;

ALTER TABLE public.participations
  ADD CONSTRAINT participations_hours_check
  CHECK (hours IS NULL OR (hours >= 0 AND hours <= 24)) NOT VALID;

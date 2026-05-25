-- Remove dead wrapper RPC that just delegates to nearby_volunteers_for_gig + adds empty email column.
-- The matching service now calls nearby_volunteers_for_gig directly.
DROP FUNCTION IF EXISTS public.match_volunteers_for_gig;

-- Security hardening: lock privileged columns on profiles, enable RLS on organizations.
--
-- Problem 1: the "Users can update own profile" policy allowed any authenticated
-- user to update ANY column of their own row, including karma_points, streak,
-- and role (self-service karma forging + privilege escalation).
-- Fix: a BEFORE UPDATE trigger rejects changes to privileged columns coming
-- from client roles. Backend code runs as postgres (inside security definer
-- functions) or service_role, both of which are exempt.
--
-- Problem 2: public.organizations had RLS disabled, exposing org rows to
-- arbitrary reads/writes through PostgREST.

-- ---------------------------------------------------------------------------
-- 1. Privileged-column guard on profiles
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.guard_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.karma_points IS DISTINCT FROM OLD.karma_points
     OR NEW.streak IS DISTINCT FROM OLD.streak
     OR NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_user NOT IN ('postgres', 'service_role') THEN
      RAISE EXCEPTION 'karma_points, streak and role cannot be updated directly'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_columns ON public.profiles;
CREATE TRIGGER profiles_guard_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_columns();

-- ---------------------------------------------------------------------------
-- 2. Row Level Security on organizations
-- ---------------------------------------------------------------------------

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = id AND m.profile_id = auth.uid()
    )
  );

-- Deliberately no INSERT/UPDATE/DELETE policies: organization records are
-- managed through the backend service role only.

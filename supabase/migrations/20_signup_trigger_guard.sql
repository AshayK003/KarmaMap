-- 20_signup_trigger_guard.sql — make the signup trigger unable to fail.
--
-- handle_new_user did a bare INSERT with a direct cast of the role metadata
-- to the user_role enum. An auth retry after a partial failure raised a
-- duplicate-key error and bricked signup; any unexpected role string aborted
-- user creation instead of defaulting to volunteer.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_role user_role := 'volunteer';
BEGIN
  IF (NEW.raw_app_meta_data->>'role') IN ('volunteer', 'ngo') THEN
    v_role := (NEW.raw_app_meta_data->>'role')::user_role;
  ELSIF (NEW.raw_user_meta_data->>'role') IN ('volunteer', 'ngo') THEN
    v_role := (NEW.raw_user_meta_data->>'role')::user_role;
  END IF;

  INSERT INTO public.profiles (id, role, name, skills)
  VALUES (
    NEW.id,
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE(
      ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'skills')),
      '{}'
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

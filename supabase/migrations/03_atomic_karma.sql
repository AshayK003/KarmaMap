CREATE OR REPLACE FUNCTION award_karma(
  p_user_id UUID,
  p_hours NUMERIC
)
RETURNS INTEGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  v_earned INTEGER;
BEGIN
  v_earned := round(p_hours * 10)::INTEGER;

  UPDATE profiles
  SET
    karma_points = COALESCE(karma_points, 0) + v_earned,
    streak = COALESCE(streak, 0) + 1
  WHERE id = p_user_id;

  RETURN v_earned;
END;
$$;

-- Aggregated analytics RPC to replace double-fetch pattern
CREATE OR REPLACE FUNCTION get_ngo_analytics(p_ngo_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $$
DECLARE
  result JSON;
BEGIN
  WITH gig_stats AS (
    SELECT
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_gigs,
      COUNT(*) AS total_gigs,
      ARRAY_AGG(id) AS gig_ids
    FROM gigs
    WHERE ngo_id = p_ngo_id
  ),
  hours_stats AS (
    SELECT COALESCE(SUM(p.hours) FILTER (WHERE p.status = 'completed'), 0) AS total_hours
    FROM participations p
    JOIN gigs g ON g.id = p.gig_id
    WHERE g.ngo_id = p_ngo_id
  ),
  chart_data AS (
    SELECT COALESCE(
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'name', LEFT(title, 20),
          'volunteers', volunteers_joined,
          'completed', CASE WHEN status = 'completed' THEN 1 ELSE 0 END
        )
        ORDER BY gig_date DESC
      ),
      '[]'::JSON
    ) AS data
    FROM gigs
    WHERE ngo_id = p_ngo_id
  )
  SELECT JSON_BUILD_OBJECT(
    'total_hours', (SELECT total_hours FROM hours_stats),
    'completed_gigs', (SELECT completed_gigs FROM gig_stats),
    'total_gigs', (SELECT total_gigs FROM gig_stats),
    'chart_data', (SELECT data FROM chart_data)
  ) INTO result;

  RETURN result;
END;
$$;
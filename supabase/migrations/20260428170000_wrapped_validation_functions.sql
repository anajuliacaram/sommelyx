-- Validation helpers for wrapped tracking.
-- Read-only, invisible to users, safe in production.

CREATE OR REPLACE FUNCTION public.get_recent_events(
  _user_id uuid,
  _limit integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  mode text,
  entity_id uuid,
  event_type text,
  quantity integer,
  price numeric(12,2),
  rating numeric(3,1),
  context jsonb,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    e.id,
    e.user_id,
    e.mode,
    e.entity_id,
    e.event_type,
    e.quantity,
    e.price,
    e.rating,
    e.context,
    e.created_at
  FROM public.events e
  WHERE e.user_id = _user_id
    AND auth.uid() = _user_id
  ORDER BY e.created_at DESC
  LIMIT GREATEST(1, LEAST(COALESCE(_limit, 20), 20));
$$;

CREATE OR REPLACE FUNCTION public.count_events_by_type(
  _user_id uuid,
  _year integer,
  _semester integer,
  _mode text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH bounds AS (
    SELECT
      make_date(_year, CASE WHEN _semester = 1 THEN 1 ELSE 7 END, 1) AS period_start,
      CASE WHEN _semester = 1 THEN make_date(_year, 7, 1) ELSE make_date(_year + 1, 1, 1) END AS period_end
  ),
  scoped AS (
    SELECT e.*
    FROM public.events e
    CROSS JOIN bounds b
    WHERE e.user_id = _user_id
      AND auth.uid() = _user_id
      AND e.created_at >= b.period_start
      AND e.created_at < b.period_end
      AND (_mode IS NULL OR e.mode = _mode)
  ),
  grouped AS (
    SELECT event_type, count(*)::int AS count
    FROM scoped
    GROUP BY event_type
  )
  SELECT jsonb_strip_nulls(
    jsonb_build_object(
      'user_id', _user_id,
      'year', _year,
      'semester', _semester,
      'mode', _mode,
      'total', COALESCE((SELECT count(*)::int FROM scoped), 0),
      'by_type', COALESCE(
        (SELECT jsonb_object_agg(event_type, count) FROM grouped),
        '{}'::jsonb
      )
    )
  );
$$;

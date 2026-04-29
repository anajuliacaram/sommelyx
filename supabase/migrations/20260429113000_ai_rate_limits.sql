CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('minute', 'day')),
  count integer NOT NULL DEFAULT 0,
  window_start timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (user_id, endpoint, scope)
);

CREATE INDEX IF NOT EXISTS idx_ai_rate_limits_user_endpoint_scope
  ON public.ai_rate_limits (user_id, endpoint, scope);

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "service_role_ai_rate_limits"
  ON public.ai_rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.consume_ai_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_scope text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE (
  allowed boolean,
  current_count integer,
  remaining integer,
  window_start timestamptz,
  reset_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now timestamptz := timezone('utc', now());
  v_row public.ai_rate_limits%ROWTYPE;
  v_new_window_start timestamptz;
  v_new_count integer;
  v_reset_at timestamptz;
BEGIN
  IF p_scope NOT IN ('minute', 'day') THEN
    RAISE EXCEPTION 'invalid scope';
  END IF;

  IF p_limit < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'invalid rate limit window';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text || '|' || p_endpoint || '|' || p_scope));

  SELECT * INTO v_row
  FROM public.ai_rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND scope = p_scope
  FOR UPDATE;

  IF NOT FOUND THEN
    v_new_count := 1;
    v_new_window_start := CASE
      WHEN p_scope = 'day' THEN date_trunc('day', v_now)
      ELSE v_now
    END;

    INSERT INTO public.ai_rate_limits (user_id, endpoint, scope, count, window_start, created_at, updated_at)
    VALUES (p_user_id, p_endpoint, p_scope, v_new_count, v_new_window_start, v_now, v_now);
  ELSE
    IF p_scope = 'day' AND (v_row.window_start AT TIME ZONE 'utc')::date <> (v_now AT TIME ZONE 'utc')::date THEN
      v_new_count := 1;
      v_new_window_start := date_trunc('day', v_now);
    ELSIF p_scope = 'minute' AND v_row.window_start <= (v_now - make_interval(secs => p_window_seconds)) THEN
      v_new_count := 1;
      v_new_window_start := v_now;
    ELSIF v_row.count >= p_limit THEN
      allowed := false;
      current_count := v_row.count;
      remaining := 0;
      window_start := v_row.window_start;
      reset_at := CASE
        WHEN p_scope = 'day' THEN date_trunc('day', v_now) + interval '1 day'
        ELSE v_row.window_start + make_interval(secs => p_window_seconds)
      END;
      RETURN NEXT;
      RETURN;
    ELSE
      v_new_count := v_row.count + 1;
      v_new_window_start := v_row.window_start;
    END IF;

    UPDATE public.ai_rate_limits
    SET count = v_new_count,
        window_start = v_new_window_start,
        updated_at = v_now
    WHERE user_id = p_user_id
      AND endpoint = p_endpoint
      AND scope = p_scope;
  END IF;

  allowed := true;
  current_count := v_new_count;
  remaining := GREATEST(p_limit - v_new_count, 0);
  window_start := v_new_window_start;
  reset_at := CASE
    WHEN p_scope = 'day' THEN date_trunc('day', v_new_window_start) + interval '1 day'
    ELSE v_new_window_start + make_interval(secs => p_window_seconds)
  END;
  RETURN NEXT;
END;
$$;

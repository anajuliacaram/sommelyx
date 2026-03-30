
CREATE TABLE public.edge_function_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  status_code integer NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('success', 'unauthorized', 'rate_limited', 'validation_error', 'internal_error', 'ai_error')),
  duration_ms integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.edge_function_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage logs"
  ON public.edge_function_logs
  FOR ALL
  TO public
  USING (auth.role() = 'service_role'::text)
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE INDEX idx_edge_function_logs_user_id ON public.edge_function_logs(user_id);
CREATE INDEX idx_edge_function_logs_function_name ON public.edge_function_logs(function_name);
CREATE INDEX idx_edge_function_logs_created_at ON public.edge_function_logs(created_at DESC);

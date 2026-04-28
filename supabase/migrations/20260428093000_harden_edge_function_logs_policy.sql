-- Restrict edge_function_logs to service_role explicitly.
DROP POLICY IF EXISTS "Service role can manage logs" ON public.edge_function_logs;

CREATE POLICY "Service role can manage logs"
  ON public.edge_function_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

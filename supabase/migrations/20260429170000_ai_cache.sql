CREATE TABLE IF NOT EXISTS public.ai_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  input_hash text NOT NULL UNIQUE,
  input_normalized text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  expires_at timestamptz NULL
);

CREATE INDEX IF NOT EXISTS idx_ai_cache_endpoint_created_at
  ON public.ai_cache (endpoint, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_cache_expires_at
  ON public.ai_cache (expires_at);

ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "service_role_ai_cache"
  ON public.ai_cache
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

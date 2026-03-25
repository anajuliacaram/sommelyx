CREATE TABLE public.consumption_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  wine_id UUID REFERENCES public.wines(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'external' CHECK (source IN ('cellar', 'external')),
  wine_name TEXT NOT NULL,
  producer TEXT,
  country TEXT,
  region TEXT,
  grape TEXT,
  style TEXT,
  vintage INTEGER,
  location TEXT,
  tasting_notes TEXT,
  rating NUMERIC,
  consumed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.consumption_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consumption" ON public.consumption_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consumption" ON public.consumption_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consumption" ON public.consumption_log
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own consumption" ON public.consumption_log
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
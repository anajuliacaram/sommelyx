
-- Create wines table
CREATE TABLE public.wines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  producer TEXT,
  country TEXT,
  region TEXT,
  grape TEXT,
  vintage INT,
  style TEXT,
  purchase_price NUMERIC(10,2),
  current_value NUMERIC(10,2),
  quantity INT NOT NULL DEFAULT 1,
  rating NUMERIC(3,1),
  drink_from INT,
  drink_until INT,
  cellar_location TEXT,
  food_pairing TEXT,
  tasting_notes TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own wines" ON public.wines FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wines" ON public.wines FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own wines" ON public.wines FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own wines" ON public.wines FOR DELETE USING (auth.uid() = user_id);

-- Create wine_events table
CREATE TABLE public.wine_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id UUID NOT NULL REFERENCES public.wines(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wine_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own events" ON public.wine_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own events" ON public.wine_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger to wines
CREATE TRIGGER update_wines_updated_at
  BEFORE UPDATE ON public.wines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

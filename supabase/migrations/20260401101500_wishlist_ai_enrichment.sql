ALTER TABLE public.wishlist
ADD COLUMN IF NOT EXISTS producer TEXT NULL,
ADD COLUMN IF NOT EXISTS vintage INTEGER NULL,
ADD COLUMN IF NOT EXISTS style TEXT NULL,
ADD COLUMN IF NOT EXISTS country TEXT NULL,
ADD COLUMN IF NOT EXISTS region TEXT NULL,
ADD COLUMN IF NOT EXISTS grape TEXT NULL,
ADD COLUMN IF NOT EXISTS target_price NUMERIC(12,2) NULL,
ADD COLUMN IF NOT EXISTS image_url TEXT NULL,
ADD COLUMN IF NOT EXISTS ai_summary TEXT NULL,
ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_wishlist_user_name ON public.wishlist(user_id, wine_name);
CREATE INDEX IF NOT EXISTS idx_wishlist_user_producer ON public.wishlist(user_id, producer);

CREATE OR REPLACE FUNCTION public.set_wishlist_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wishlist_updated_at ON public.wishlist;

CREATE TRIGGER trg_wishlist_updated_at
BEFORE UPDATE ON public.wishlist
FOR EACH ROW
EXECUTE FUNCTION public.set_wishlist_updated_at();

INSERT INTO storage.buckets (id, name, public)
VALUES ('wishlist-images', 'wishlist-images', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DO $$ BEGIN
  CREATE POLICY "Users can upload own wishlist images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'wishlist-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own wishlist images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'wishlist-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'wishlist-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete own wishlist images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'wishlist-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

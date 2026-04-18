-- Create public bucket for wine label images
INSERT INTO storage.buckets (id, name, public)
VALUES ('wine-label-images', 'wine-label-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public read
CREATE POLICY "Public can view wine label images"
ON storage.objects FOR SELECT
USING (bucket_id = 'wine-label-images');

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload own wine label images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wine-label-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Authenticated users can update their own files
CREATE POLICY "Users can update own wine label images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'wine-label-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Authenticated users can delete their own files
CREATE POLICY "Users can delete own wine label images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'wine-label-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
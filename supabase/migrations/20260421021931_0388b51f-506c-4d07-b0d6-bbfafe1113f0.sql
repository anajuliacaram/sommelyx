-- Make the wine-label-images bucket private
UPDATE storage.buckets SET public = false WHERE id = 'wine-label-images';

-- Drop all existing policies for this bucket
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (qual ILIKE '%wine-label-images%' OR with_check ILIKE '%wine-label-images%' OR policyname ILIKE '%wine-label-images%' OR policyname ILIKE '%wine_label_images%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Owner-only SELECT (first folder segment must be auth.uid())
CREATE POLICY "wine-label-images owner read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'wine-label-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Owner-only INSERT
CREATE POLICY "wine-label-images owner insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wine-label-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Owner-only UPDATE
CREATE POLICY "wine-label-images owner update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'wine-label-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'wine-label-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Owner-only DELETE
CREATE POLICY "wine-label-images owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'wine-label-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
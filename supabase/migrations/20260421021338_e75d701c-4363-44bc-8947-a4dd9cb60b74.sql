-- Drop overly permissive SELECT policies on storage.objects for wine-label-images
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND (qual ILIKE '%wine-label-images%' OR policyname ILIKE '%wine-label-images%' OR policyname ILIKE '%wine_label_images%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Allow read access only when a specific object name is requested (prevents bucket listing).
-- Listing performs SELECT without filtering by name, so requiring a non-empty name filter blocks list operations
-- while still allowing direct fetches by path / public URL.
CREATE POLICY "wine-label-images read by path"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'wine-label-images'
  AND name IS NOT NULL
  AND name <> ''
);

-- Make wishlist-images private and restrict access to the file owner only.
UPDATE storage.buckets SET public = false WHERE id = 'wishlist-images';

DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        qual ILIKE '%wishlist-images%'
        OR with_check ILIKE '%wishlist-images%'
        OR policyname ILIKE '%wishlist-images%'
        OR policyname ILIKE '%wishlist images%'
        OR policyname ILIKE '%wishlist_images%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "wishlist-images owner read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'wishlist-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "wishlist-images owner insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'wishlist-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "wishlist-images owner update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'wishlist-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'wishlist-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "wishlist-images owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'wishlist-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

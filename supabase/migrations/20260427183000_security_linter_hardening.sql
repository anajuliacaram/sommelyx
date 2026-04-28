-- Security hardening before payment rollout.
-- Fix mutable search_path, remove public bucket listing, and tighten RPC grants.

-- 1) Fix mutable search_path warning for wishlist timestamp trigger.
CREATE OR REPLACE FUNCTION public.set_wishlist_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 2) Remove broad public SELECT/listing access on wishlist-images.
-- Public bucket delivery remains available through direct object URLs.
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname
      FROM pg_policies
     WHERE schemaname = 'storage'
       AND tablename = 'objects'
       AND cmd = 'SELECT'
       AND (
         qual ILIKE '%wishlist-images%'
         OR policyname ILIKE '%wishlist-images%'
         OR policyname ILIKE '%wishlist images%'
         OR policyname ILIKE '%wishlist_images%'
       )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- 3) Restrict internal email queue helpers to service_role only.
REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(TEXT, JSONB) TO service_role;

REVOKE EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.read_email_batch(TEXT, INT, INT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_email(TEXT, BIGINT) TO service_role;

REVOKE EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.move_to_dlq(TEXT, TEXT, BIGINT, JSONB) TO service_role;

-- 4) Trigger/helper functions should not be public RPCs.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;

-- 5) Keep stock mutation callable only to authenticated users, but ensure auth.uid() validation remains server-side.
-- This function is intentionally still executable by authenticated clients because the app calls it directly.
REVOKE EXECUTE ON FUNCTION public.adjust_wine_quantity(uuid, uuid, text, integer, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.adjust_wine_quantity(uuid, uuid, text, integer, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.adjust_wine_quantity(uuid, uuid, text, integer, text, text, text) TO authenticated;

-- 6) Reminder for platform settings: enable leaked password protection in Supabase Auth dashboard.

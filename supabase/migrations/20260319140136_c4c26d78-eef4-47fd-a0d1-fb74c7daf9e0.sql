-- Fix wine_events INSERT policy to validate wine ownership
DROP POLICY IF EXISTS "Users can insert own events" ON public.wine_events;

CREATE POLICY "Users can insert own events"
ON public.wine_events
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.wines WHERE wines.id = wine_id AND wines.user_id = auth.uid())
);

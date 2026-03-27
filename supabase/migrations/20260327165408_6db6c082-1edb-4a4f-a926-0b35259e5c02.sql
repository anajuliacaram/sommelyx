CREATE POLICY "Users can update own events"
ON public.wine_events
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events"
ON public.wine_events
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
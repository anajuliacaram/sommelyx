-- Commercial stock audit trail (who/why/when + before/after quantities)

ALTER TABLE public.wine_events
  ADD COLUMN IF NOT EXISTS profile_type public.profile_type,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS previous_quantity integer,
  ADD COLUMN IF NOT EXISTS new_quantity integer,
  ADD COLUMN IF NOT EXISTS quantity_delta integer,
  ADD COLUMN IF NOT EXISTS responsible_name text,
  ADD COLUMN IF NOT EXISTS reason text;

CREATE INDEX IF NOT EXISTS wine_events_user_created_at_idx
  ON public.wine_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS wine_events_wine_created_at_idx
  ON public.wine_events (wine_id, created_at DESC);

-- Extend existing RPC so older clients keep working (new args are optional).
CREATE OR REPLACE FUNCTION public.adjust_wine_quantity(
  _wine_id uuid,
  _user_id uuid,
  _event_type text,
  _quantity integer,
  _notes text DEFAULT NULL,
  _responsible_name text DEFAULT NULL,
  _reason text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor_user_id uuid;
  prev_qty integer;
  new_qty integer;
  delta_qty integer;
  eff_profile_type public.profile_type;
  resp text;
  rsn text;
BEGIN
  actor_user_id := auth.uid();
  IF actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  -- Defense-in-depth: never trust client-supplied _user_id for a SECURITY DEFINER function.
  IF _user_id IS NOT NULL AND _user_id <> actor_user_id THEN
    RAISE EXCEPTION 'User mismatch';
  END IF;

  IF _quantity IS NULL OR _quantity <= 0 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  -- Verify ownership and lock row to compute a reliable before/after.
  SELECT quantity
    INTO prev_qty
    FROM public.wines
   WHERE id = _wine_id AND user_id = actor_user_id
   FOR UPDATE;

  IF prev_qty IS NULL THEN
    RAISE EXCEPTION 'Wine not found or not owned by user';
  END IF;

  -- Resolve profile type (server-side source of truth).
  SELECT profile_type
    INTO eff_profile_type
    FROM public.profiles
   WHERE user_id = actor_user_id;

  resp := NULLIF(btrim(COALESCE(_responsible_name, '')), '');
  rsn := NULLIF(btrim(COALESCE(_reason, '')), '');

  -- For commercial operations, require audit fields on stock-changing events.
  IF eff_profile_type = 'commercial' THEN
    IF _event_type IN ('add', 'exit', 'stock_increase', 'stock_decrease', 'stock_adjustment', 'stockout_registered') THEN
      IF resp IS NULL THEN
        RAISE EXCEPTION 'Responsible name is required';
      END IF;
      IF rsn IS NULL THEN
        RAISE EXCEPTION 'Reason is required';
      END IF;
      IF rsn = 'Outro' AND NULLIF(btrim(COALESCE(_notes, '')), '') IS NULL THEN
        RAISE EXCEPTION 'Notes are required when reason is Outro';
      END IF;
    END IF;
  END IF;

  -- Atomically update quantity first.
  IF _event_type IN ('add', 'stock_increase', 'stock_adjustment') THEN
    UPDATE public.wines
       SET quantity = quantity + _quantity
     WHERE id = _wine_id AND user_id = actor_user_id
     RETURNING quantity INTO new_qty;
  ELSE
    UPDATE public.wines
       SET quantity = GREATEST(0, quantity - _quantity)
     WHERE id = _wine_id AND user_id = actor_user_id
     RETURNING quantity INTO new_qty;
  END IF;

  delta_qty := new_qty - prev_qty;

  -- Insert the event with audit metadata.
  INSERT INTO public.wine_events (
    wine_id,
    user_id,
    created_by_user_id,
    profile_type,
    event_type,
    quantity,
    notes,
    previous_quantity,
    new_quantity,
    quantity_delta,
    responsible_name,
    reason
  )
  VALUES (
    _wine_id,
    actor_user_id,
    actor_user_id,
    eff_profile_type,
    _event_type,
    _quantity,
    _notes,
    prev_qty,
    new_qty,
    delta_qty,
    resp,
    rsn
  );

  RETURN new_qty;
END;
$$;

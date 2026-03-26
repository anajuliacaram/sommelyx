CREATE OR REPLACE FUNCTION public.adjust_wine_quantity(
  _wine_id uuid,
  _user_id uuid,
  _event_type text,
  _quantity integer,
  _notes text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_qty integer;
BEGIN
  -- Verify the wine belongs to the user
  IF NOT EXISTS (SELECT 1 FROM wines WHERE id = _wine_id AND user_id = _user_id) THEN
    RAISE EXCEPTION 'Wine not found or not owned by user';
  END IF;

  -- Insert the event
  INSERT INTO wine_events (wine_id, user_id, event_type, quantity, notes)
  VALUES (_wine_id, _user_id, _event_type, _quantity, _notes);

  -- Atomically update quantity
  IF _event_type = 'add' THEN
    UPDATE wines SET quantity = quantity + _quantity WHERE id = _wine_id AND user_id = _user_id
    RETURNING quantity INTO new_qty;
  ELSE
    UPDATE wines SET quantity = GREATEST(0, quantity - _quantity) WHERE id = _wine_id AND user_id = _user_id
    RETURNING quantity INTO new_qty;
  END IF;

  RETURN new_qty;
END;
$$;
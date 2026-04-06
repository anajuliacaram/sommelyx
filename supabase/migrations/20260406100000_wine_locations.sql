-- Structured wine location tracking (personal + commercial)
-- - Commercial supports multiple locations with quantity per location
-- - All location changes are auditable via wine_location_events

-- 1) Tables
CREATE TABLE IF NOT EXISTS public.wine_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id uuid NOT NULL REFERENCES public.wines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  profile_type public.profile_type,
  sector text,
  zone text,
  level text,
  position text,
  manual_label text,
  formatted_label text,
  quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wine_locations_user_wine_idx
  ON public.wine_locations (user_id, wine_id);

CREATE INDEX IF NOT EXISTS wine_locations_user_sector_idx
  ON public.wine_locations (user_id, sector);

CREATE INDEX IF NOT EXISTS wine_locations_user_zone_idx
  ON public.wine_locations (user_id, zone);

CREATE INDEX IF NOT EXISTS wine_locations_user_level_idx
  ON public.wine_locations (user_id, level);

CREATE TABLE IF NOT EXISTS public.wine_location_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id uuid NOT NULL REFERENCES public.wines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_by_user_id uuid,
  profile_type public.profile_type,
  action_type text NOT NULL, -- transfer | meta_changed | created | removed
  from_location_id uuid,
  to_location_id uuid,
  previous_label text,
  new_label text,
  quantity_moved integer,
  responsible_name text,
  reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wine_location_events_user_created_at_idx
  ON public.wine_location_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS wine_location_events_wine_created_at_idx
  ON public.wine_location_events (wine_id, created_at DESC);

-- 2) Helper formatting
CREATE OR REPLACE FUNCTION public.format_wine_location_label(
  _sector text,
  _zone text,
  _level text,
  _position text,
  _manual_label text
)
RETURNS text
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT NULLIF(btrim(
    COALESCE(NULLIF(btrim(_manual_label), ''), (
      SELECT array_to_string(
        array_remove(
          ARRAY[
            NULLIF(btrim(_sector), ''),
            NULLIF(btrim(_zone), ''),
            NULLIF(btrim(_level), ''),
            NULLIF(btrim(_position), '')
          ],
          NULL
        ),
        ' • '
      )
    ))
  ), '');
$$;

-- 3) Keep formatted_label + updated_at consistent
CREATE OR REPLACE FUNCTION public.wine_locations_set_derived()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  eff_profile_type public.profile_type;
BEGIN
  -- Always derive profile_type from the user's profile when available (defense-in-depth).
  IF NEW.user_id IS NOT NULL THEN
    SELECT profile_type INTO eff_profile_type
      FROM public.profiles
     WHERE user_id = NEW.user_id;
    IF eff_profile_type IS NOT NULL THEN
      NEW.profile_type := eff_profile_type;
    END IF;
  END IF;

  -- Commercial location updates must be audited (server-side enforcement).
  -- We allow admin/migration contexts (auth.uid() IS NULL) without this constraint.
  IF NEW.profile_type = 'commercial' AND auth.uid() IS NOT NULL THEN
    IF current_setting('sommelyx.allow_wine_location_write', true) IS DISTINCT FROM '1' THEN
      RAISE EXCEPTION 'Commercial location changes require audit';
    END IF;
  END IF;

  NEW.updated_at := now();
  NEW.formatted_label := public.format_wine_location_label(NEW.sector, NEW.zone, NEW.level, NEW.position, NEW.manual_label);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wine_locations_set_derived ON public.wine_locations;
CREATE TRIGGER trg_wine_locations_set_derived
  BEFORE INSERT OR UPDATE ON public.wine_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.wine_locations_set_derived();

-- 4) RLS
ALTER TABLE public.wine_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wine_location_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wine locations" ON public.wine_locations;
CREATE POLICY "Users can view own wine locations"
  ON public.wine_locations
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wine locations" ON public.wine_locations;
CREATE POLICY "Users can insert own wine locations"
  ON public.wine_locations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.wines
      WHERE wines.id = wine_locations.wine_id
        AND wines.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own wine locations" ON public.wine_locations;
CREATE POLICY "Users can update own wine locations"
  ON public.wine_locations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own wine locations" ON public.wine_locations;
CREATE POLICY "Users can delete own wine locations"
  ON public.wine_locations
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own wine location events" ON public.wine_location_events;
CREATE POLICY "Users can view own wine location events"
  ON public.wine_location_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wine location events" ON public.wine_location_events;
CREATE POLICY "Users can insert own wine location events"
  ON public.wine_location_events
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.wines
      WHERE wines.id = wine_location_events.wine_id
        AND wines.user_id = auth.uid()
    )
    AND (
      wine_location_events.profile_type IS DISTINCT FROM 'commercial'
      OR (
        wine_location_events.responsible_name IS NOT NULL
        AND wine_location_events.reason IS NOT NULL
        AND (
          wine_location_events.reason <> 'Outro'
          OR wine_location_events.notes IS NOT NULL
        )
      )
    )
  );

-- 5) Backfill: one location per wine (keeps existing cellar_location usable)
INSERT INTO public.wine_locations (wine_id, user_id, profile_type, sector, manual_label, quantity)
SELECT w.id, w.user_id, p.profile_type, NULL, w.cellar_location, w.quantity
FROM public.wines w
LEFT JOIN public.profiles p ON p.user_id = w.user_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.wine_locations wl WHERE wl.wine_id = w.id
);

-- 6) RPC: stock adjustments by location for commercial
-- NOTE: Extends the existing RPC; new args are optional.
CREATE OR REPLACE FUNCTION public.adjust_wine_quantity(
  _wine_id uuid,
  _user_id uuid,
  _event_type text,
  _quantity integer,
  _notes text DEFAULT NULL,
  _responsible_name text DEFAULT NULL,
  _reason text DEFAULT NULL,
  _location_id uuid DEFAULT NULL
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
  loc_id uuid;
  loc_prev integer;
  loc_next integer;
BEGIN
  actor_user_id := auth.uid();
  IF actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _user_id IS NOT NULL AND _user_id <> actor_user_id THEN
    RAISE EXCEPTION 'User mismatch';
  END IF;

  IF _quantity IS NULL OR _quantity <= 0 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  -- Allow controlled location quantity updates in commercial mode (enforced by trigger).
  PERFORM set_config('sommelyx.allow_wine_location_write', '1', true);

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

  -- Choose location id: commercial requires explicit location for stock-changing operations (except stockout).
  loc_id := _location_id;
  IF eff_profile_type = 'commercial' THEN
    IF _event_type IN ('add', 'exit', 'stock_increase', 'stock_decrease', 'stock_adjustment') THEN
      IF loc_id IS NULL THEN
        RAISE EXCEPTION 'Location is required';
      END IF;
    END IF;
  END IF;

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

  -- Ruptura: zera tudo (total + todas as localizações)
  IF _event_type = 'stockout_registered' THEN
    UPDATE public.wines
       SET quantity = 0
     WHERE id = _wine_id AND user_id = actor_user_id
     RETURNING quantity INTO new_qty;

    UPDATE public.wine_locations
       SET quantity = 0
     WHERE wine_id = _wine_id AND user_id = actor_user_id;

    delta_qty := new_qty - prev_qty;

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
      prev_qty, -- quantidade afetada
      _notes,
      prev_qty,
      new_qty,
      delta_qty,
      resp,
      rsn
    );

    RETURN new_qty;
  END IF;

  -- Personal fallback: if location not provided, use first location (or create one).
  IF loc_id IS NULL THEN
    SELECT id INTO loc_id
      FROM public.wine_locations
     WHERE wine_id = _wine_id AND user_id = actor_user_id
     ORDER BY created_at ASC
     LIMIT 1;

    IF loc_id IS NULL THEN
      INSERT INTO public.wine_locations (wine_id, user_id, profile_type, quantity)
      VALUES (_wine_id, actor_user_id, eff_profile_type, prev_qty)
      RETURNING id INTO loc_id;
    END IF;
  END IF;

  -- Lock location row
  SELECT quantity INTO loc_prev
    FROM public.wine_locations
   WHERE id = loc_id AND wine_id = _wine_id AND user_id = actor_user_id
   FOR UPDATE;

  IF loc_prev IS NULL THEN
    RAISE EXCEPTION 'Location not found';
  END IF;

  -- Apply changes
  IF _event_type IN ('add', 'stock_increase', 'stock_adjustment') THEN
    UPDATE public.wines
       SET quantity = quantity + _quantity
     WHERE id = _wine_id AND user_id = actor_user_id
     RETURNING quantity INTO new_qty;

    UPDATE public.wine_locations
       SET quantity = quantity + _quantity
     WHERE id = loc_id AND user_id = actor_user_id
     RETURNING quantity INTO loc_next;
  ELSE
    IF loc_prev < _quantity THEN
      RAISE EXCEPTION 'Insufficient stock in location';
    END IF;

    UPDATE public.wines
       SET quantity = GREATEST(0, quantity - _quantity)
     WHERE id = _wine_id AND user_id = actor_user_id
     RETURNING quantity INTO new_qty;

    UPDATE public.wine_locations
       SET quantity = quantity - _quantity
     WHERE id = loc_id AND user_id = actor_user_id
     RETURNING quantity INTO loc_next;
  END IF;

  delta_qty := new_qty - prev_qty;

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

-- 7) RPC: transfer stock between locations (no total change)
CREATE OR REPLACE FUNCTION public.transfer_wine_location_quantity(
  _wine_id uuid,
  _from_location_id uuid,
  _to_location_id uuid,
  _quantity integer,
  _notes text DEFAULT NULL,
  _responsible_name text DEFAULT NULL,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor_user_id uuid;
  eff_profile_type public.profile_type;
  resp text;
  rsn text;
  from_prev integer;
  to_prev integer;
  from_label text;
  to_label text;
BEGIN
  actor_user_id := auth.uid();
  IF actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _quantity IS NULL OR _quantity <= 0 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  -- Allow controlled location quantity updates in commercial mode (enforced by trigger).
  PERFORM set_config('sommelyx.allow_wine_location_write', '1', true);

  SELECT profile_type INTO eff_profile_type
    FROM public.profiles
   WHERE user_id = actor_user_id;

  resp := NULLIF(btrim(COALESCE(_responsible_name, '')), '');
  rsn := NULLIF(btrim(COALESCE(_reason, '')), '');

  IF eff_profile_type = 'commercial' THEN
    IF resp IS NULL THEN RAISE EXCEPTION 'Responsible name is required'; END IF;
    IF rsn IS NULL THEN RAISE EXCEPTION 'Reason is required'; END IF;
    IF rsn = 'Outro' AND NULLIF(btrim(COALESCE(_notes, '')), '') IS NULL THEN
      RAISE EXCEPTION 'Notes are required when reason is Outro';
    END IF;
  END IF;

  -- Lock both rows
  SELECT quantity, formatted_label INTO from_prev, from_label
    FROM public.wine_locations
   WHERE id = _from_location_id AND wine_id = _wine_id AND user_id = actor_user_id
   FOR UPDATE;
  IF from_prev IS NULL THEN RAISE EXCEPTION 'From location not found'; END IF;
  IF from_prev < _quantity THEN RAISE EXCEPTION 'Insufficient stock in location'; END IF;

  SELECT quantity, formatted_label INTO to_prev, to_label
    FROM public.wine_locations
   WHERE id = _to_location_id AND wine_id = _wine_id AND user_id = actor_user_id
   FOR UPDATE;
  IF to_prev IS NULL THEN RAISE EXCEPTION 'To location not found'; END IF;

  UPDATE public.wine_locations
     SET quantity = quantity - _quantity
   WHERE id = _from_location_id AND user_id = actor_user_id;

  UPDATE public.wine_locations
     SET quantity = quantity + _quantity
   WHERE id = _to_location_id AND user_id = actor_user_id;

  INSERT INTO public.wine_location_events (
    wine_id,
    user_id,
    created_by_user_id,
    profile_type,
    action_type,
    from_location_id,
    to_location_id,
    previous_label,
    new_label,
    quantity_moved,
    responsible_name,
    reason,
    notes
  )
  VALUES (
    _wine_id,
    actor_user_id,
    actor_user_id,
    eff_profile_type,
    'transfer',
    _from_location_id,
    _to_location_id,
    from_label,
    to_label,
    _quantity,
    resp,
    rsn,
    _notes
  );
END;
$$;

-- 8) RPC: create location (logs an event; commercial requires audit)
CREATE OR REPLACE FUNCTION public.create_wine_location(
  _wine_id uuid,
  _sector text DEFAULT NULL,
  _zone text DEFAULT NULL,
  _level text DEFAULT NULL,
  _position text DEFAULT NULL,
  _manual_label text DEFAULT NULL,
  _quantity integer DEFAULT 0,
  _responsible_name text DEFAULT NULL,
  _reason text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor_user_id uuid;
  eff_profile_type public.profile_type;
  resp text;
  rsn text;
  created_id uuid;
  new_label text;
  existing_ct integer;
BEGIN
  actor_user_id := auth.uid();
  IF actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _quantity IS NULL OR _quantity < 0 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  -- Verify ownership
  IF NOT EXISTS (SELECT 1 FROM public.wines WHERE id = _wine_id AND user_id = actor_user_id) THEN
    RAISE EXCEPTION 'Wine not found or not owned by user';
  END IF;

  SELECT profile_type INTO eff_profile_type
    FROM public.profiles
   WHERE user_id = actor_user_id;

  resp := NULLIF(btrim(COALESCE(_responsible_name, '')), '');
  rsn := NULLIF(btrim(COALESCE(_reason, '')), '');

  IF eff_profile_type = 'commercial' THEN
    IF resp IS NULL THEN RAISE EXCEPTION 'Responsible name is required'; END IF;
    IF rsn IS NULL THEN RAISE EXCEPTION 'Reason is required'; END IF;
    IF rsn = 'Outro' AND NULLIF(btrim(COALESCE(_notes, '')), '') IS NULL THEN
      RAISE EXCEPTION 'Notes are required when reason is Outro';
    END IF;
  END IF;

  SELECT COUNT(*) INTO existing_ct
    FROM public.wine_locations
   WHERE wine_id = _wine_id AND user_id = actor_user_id;
  IF existing_ct > 0 AND _quantity > 0 THEN
    RAISE EXCEPTION 'Use transfer to move stock into a new location';
  END IF;

  -- Allow controlled location writes in commercial mode (enforced by trigger).
  PERFORM set_config('sommelyx.allow_wine_location_write', '1', true);

  INSERT INTO public.wine_locations (
    wine_id, user_id, profile_type, sector, zone, level, position, manual_label, quantity
  )
  VALUES (
    _wine_id, actor_user_id, eff_profile_type, _sector, _zone, _level, _position, _manual_label, COALESCE(_quantity, 0)
  )
  RETURNING id, formatted_label INTO created_id, new_label;

  INSERT INTO public.wine_location_events (
    wine_id,
    user_id,
    created_by_user_id,
    profile_type,
    action_type,
    from_location_id,
    to_location_id,
    previous_label,
    new_label,
    quantity_moved,
    responsible_name,
    reason,
    notes
  )
  VALUES (
    _wine_id,
    actor_user_id,
    actor_user_id,
    eff_profile_type,
    'created',
    NULL,
    created_id,
    NULL,
    new_label,
    NULL,
    resp,
    rsn,
    _notes
  );

  RETURN created_id;
END;
$$;

-- 9) RPC: update location metadata (logs an event; commercial requires audit)
CREATE OR REPLACE FUNCTION public.update_wine_location_meta(
  _location_id uuid,
  _sector text DEFAULT NULL,
  _zone text DEFAULT NULL,
  _level text DEFAULT NULL,
  _position text DEFAULT NULL,
  _manual_label text DEFAULT NULL,
  _responsible_name text DEFAULT NULL,
  _reason text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  actor_user_id uuid;
  eff_profile_type public.profile_type;
  resp text;
  rsn text;
  wine_id uuid;
  prev_label text;
  next_label text;
BEGIN
  actor_user_id := auth.uid();
  IF actor_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT profile_type INTO eff_profile_type
    FROM public.profiles
   WHERE user_id = actor_user_id;

  resp := NULLIF(btrim(COALESCE(_responsible_name, '')), '');
  rsn := NULLIF(btrim(COALESCE(_reason, '')), '');

  IF eff_profile_type = 'commercial' THEN
    IF resp IS NULL THEN RAISE EXCEPTION 'Responsible name is required'; END IF;
    IF rsn IS NULL THEN RAISE EXCEPTION 'Reason is required'; END IF;
    IF rsn = 'Outro' AND NULLIF(btrim(COALESCE(_notes, '')), '') IS NULL THEN
      RAISE EXCEPTION 'Notes are required when reason is Outro';
    END IF;
  END IF;

  SELECT wl.wine_id, wl.formatted_label
    INTO wine_id, prev_label
    FROM public.wine_locations wl
   WHERE wl.id = _location_id AND wl.user_id = actor_user_id
   FOR UPDATE;
  IF wine_id IS NULL THEN
    RAISE EXCEPTION 'Location not found';
  END IF;

  -- Verify wine ownership
  IF NOT EXISTS (SELECT 1 FROM public.wines WHERE id = wine_id AND user_id = actor_user_id) THEN
    RAISE EXCEPTION 'Wine not found or not owned by user';
  END IF;

  -- Allow controlled location writes in commercial mode (enforced by trigger).
  PERFORM set_config('sommelyx.allow_wine_location_write', '1', true);

  UPDATE public.wine_locations
     SET sector = _sector,
         zone = _zone,
         level = _level,
         position = _position,
         manual_label = _manual_label
   WHERE id = _location_id AND user_id = actor_user_id
   RETURNING formatted_label INTO next_label;

  INSERT INTO public.wine_location_events (
    wine_id,
    user_id,
    created_by_user_id,
    profile_type,
    action_type,
    from_location_id,
    to_location_id,
    previous_label,
    new_label,
    quantity_moved,
    responsible_name,
    reason,
    notes
  )
  VALUES (
    wine_id,
    actor_user_id,
    actor_user_id,
    eff_profile_type,
    'meta_changed',
    NULL,
    _location_id,
    prev_label,
    next_label,
    NULL,
    resp,
    rsn,
    _notes
  );
END;
$$;

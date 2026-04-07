
-- wine_locations table
CREATE TABLE public.wine_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id uuid NOT NULL REFERENCES public.wines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  profile_type text DEFAULT NULL,
  sector text DEFAULT NULL,
  zone text DEFAULT NULL,
  level text DEFAULT NULL,
  position text DEFAULT NULL,
  manual_label text DEFAULT NULL,
  formatted_label text DEFAULT NULL,
  quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wine_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wine_locations"
  ON public.wine_locations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- wine_location_events table
CREATE TABLE public.wine_location_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id uuid NOT NULL REFERENCES public.wines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_by_user_id uuid DEFAULT NULL,
  profile_type text DEFAULT NULL,
  action_type text NOT NULL DEFAULT 'create',
  from_location_id uuid DEFAULT NULL,
  to_location_id uuid DEFAULT NULL,
  previous_label text DEFAULT NULL,
  new_label text DEFAULT NULL,
  quantity_moved integer DEFAULT NULL,
  responsible_name text DEFAULT NULL,
  reason text DEFAULT NULL,
  notes text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wine_location_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own wine_location_events"
  ON public.wine_location_events
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Helper to build formatted label from parts
CREATE OR REPLACE FUNCTION public.build_location_label(
  _sector text, _zone text, _level text, _position text, _manual_label text
) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN _manual_label IS NOT NULL AND _manual_label <> '' THEN _manual_label
    ELSE NULLIF(TRIM(CONCAT_WS(' › ', NULLIF(_sector,''), NULLIF(_zone,''), NULLIF(_level,''), NULLIF(_position,''))), '')
  END;
$$;

-- create_wine_location RPC
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
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _loc_id uuid;
  _label text;
  _uid uuid := auth.uid();
  _ptype text;
BEGIN
  SELECT profile_type INTO _ptype FROM public.profiles WHERE user_id = _uid LIMIT 1;
  _label := build_location_label(_sector, _zone, _level, _position, _manual_label);

  INSERT INTO public.wine_locations (wine_id, user_id, profile_type, sector, zone, level, position, manual_label, formatted_label, quantity)
  VALUES (_wine_id, _uid, _ptype, _sector, _zone, _level, _position, _manual_label, _label, _quantity)
  RETURNING id INTO _loc_id;

  INSERT INTO public.wine_location_events (wine_id, user_id, created_by_user_id, profile_type, action_type, to_location_id, new_label, quantity_moved, responsible_name, reason, notes)
  VALUES (_wine_id, _uid, _uid, _ptype, 'create', _loc_id, _label, _quantity, _responsible_name, _reason, _notes);

  RETURN _loc_id;
END;
$$;

-- update_wine_location_meta RPC
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
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _old_label text;
  _new_label text;
  _wid uuid;
  _ptype text;
BEGIN
  SELECT formatted_label, wine_id INTO _old_label, _wid FROM public.wine_locations WHERE id = _location_id AND user_id = _uid;
  IF NOT FOUND THEN RAISE EXCEPTION 'Location not found';
  END IF;

  _new_label := build_location_label(_sector, _zone, _level, _position, _manual_label);
  SELECT profile_type INTO _ptype FROM public.profiles WHERE user_id = _uid LIMIT 1;

  UPDATE public.wine_locations
  SET sector = _sector, zone = _zone, level = _level, position = _position,
      manual_label = _manual_label, formatted_label = _new_label, updated_at = now()
  WHERE id = _location_id AND user_id = _uid;

  INSERT INTO public.wine_location_events (wine_id, user_id, created_by_user_id, profile_type, action_type, to_location_id, previous_label, new_label, responsible_name, reason, notes)
  VALUES (_wid, _uid, _uid, _ptype, 'update', _location_id, _old_label, _new_label, _responsible_name, _reason, _notes);
END;
$$;

-- transfer_wine_location_quantity RPC
CREATE OR REPLACE FUNCTION public.transfer_wine_location_quantity(
  _wine_id uuid,
  _from_location_id uuid,
  _to_location_id uuid,
  _quantity integer,
  _notes text DEFAULT NULL,
  _responsible_name text DEFAULT NULL,
  _reason text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _ptype text;
  _from_label text;
  _to_label text;
BEGIN
  SELECT profile_type INTO _ptype FROM public.profiles WHERE user_id = _uid LIMIT 1;
  SELECT formatted_label INTO _from_label FROM public.wine_locations WHERE id = _from_location_id AND user_id = _uid;
  SELECT formatted_label INTO _to_label FROM public.wine_locations WHERE id = _to_location_id AND user_id = _uid;

  UPDATE public.wine_locations SET quantity = quantity - _quantity, updated_at = now() WHERE id = _from_location_id AND user_id = _uid;
  UPDATE public.wine_locations SET quantity = quantity + _quantity, updated_at = now() WHERE id = _to_location_id AND user_id = _uid;

  INSERT INTO public.wine_location_events (wine_id, user_id, created_by_user_id, profile_type, action_type, from_location_id, to_location_id, previous_label, new_label, quantity_moved, responsible_name, reason, notes)
  VALUES (_wine_id, _uid, _uid, _ptype, 'transfer', _from_location_id, _to_location_id, _from_label, _to_label, _quantity, _responsible_name, _reason, _notes);
END;
$$;

-- Wrapped foundation: invisible event tracking for future semi-annual reports.
-- No UI changes, no user-facing behavior changes.

-- 1) Core events table
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('personal', 'commercial')),
  entity_id uuid NOT NULL,
  event_type text NOT NULL CHECK (
    event_type IN (
      'added_to_cellar',
      'bottle_opened',
      'wine_rated',
      'consumption_logged',
      'sale_completed',
      'stock_added'
    )
  ),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price numeric(12,2),
  rating numeric(3,1),
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_user_created_at_idx
  ON public.events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS events_entity_created_at_idx
  ON public.events (entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS events_user_mode_created_at_idx
  ON public.events (user_id, mode, created_at DESC);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wrapped events" ON public.events;
CREATE POLICY "Users can view own wrapped events"
  ON public.events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own wrapped events" ON public.events;
CREATE POLICY "Users can insert own wrapped events"
  ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2) Optional semester summaries (background jobs only)
CREATE TABLE IF NOT EXISTS public.user_semester_summary (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year integer NOT NULL,
  semester smallint NOT NULL CHECK (semester IN (1, 2)),
  mode text NOT NULL CHECK (mode IN ('personal', 'commercial')),
  computed_metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (user_id, year, semester, mode)
);

CREATE INDEX IF NOT EXISTS user_semester_summary_user_year_idx
  ON public.user_semester_summary (user_id, year, semester, mode);

ALTER TABLE public.user_semester_summary ENABLE ROW LEVEL SECURITY;

-- No public policies on purpose: this table is meant for background jobs / service role only.

-- 3) Internal helpers
CREATE OR REPLACE FUNCTION public.resolve_wrapped_mode(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(
    (SELECT p.profile_type::text FROM public.profiles p WHERE p.user_id = _user_id LIMIT 1),
    'personal'
  );
$$;

CREATE OR REPLACE FUNCTION public.normalize_wrapped_wine_type(_style text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN _style IS NULL OR btrim(_style) = '' THEN NULL
    WHEN lower(_style) ~ '(espum|champ|prosecco|cava|sparkling|frisante)' THEN 'espumante'
    WHEN lower(_style) ~ '(ros[eé]|rose)' THEN 'rosé'
    WHEN lower(_style) ~ '(sobrem|dessert|fortif|porto|madeira)' THEN 'sobremesa'
    WHEN lower(_style) ~ '(branco|white)' THEN 'branco'
    WHEN lower(_style) ~ '(tinto|red)' THEN 'tinto'
    ELSE btrim(lower(_style))
  END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_wrapped_region(_region text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT NULLIF(btrim(lower(regexp_replace(COALESCE(_region, ''), '\s+', ' ', 'g'))), '');
$$;

CREATE OR REPLACE FUNCTION public.build_wrapped_event_context(
  _source_table text,
  _entity_type text,
  _wine_name text DEFAULT NULL,
  _style text DEFAULT NULL,
  _region text DEFAULT NULL,
  _extra jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_strip_nulls(
    jsonb_build_object(
      'source_table', _source_table,
      'entity_type', _entity_type,
      'wine_name', NULLIF(btrim(_wine_name), ''),
      'wine_type', public.normalize_wrapped_wine_type(_style),
      'region_normalized', public.normalize_wrapped_region(_region)
    ) || COALESCE(_extra, '{}'::jsonb)
  );
$$;

CREATE OR REPLACE FUNCTION public.record_wrapped_event(
  _user_id uuid,
  _mode text,
  _entity_id uuid,
  _event_type text,
  _quantity integer DEFAULT 1,
  _price numeric DEFAULT NULL,
  _rating numeric DEFAULT NULL,
  _context jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.events (
    user_id,
    mode,
    entity_id,
    event_type,
    quantity,
    price,
    rating,
    context
  )
  VALUES (
    _user_id,
    COALESCE(NULLIF(_mode, ''), 'personal'),
    _entity_id,
    _event_type,
    COALESCE(NULLIF(_quantity, 0), 1),
    _price,
    _rating,
    COALESCE(_context, '{}'::jsonb)
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[wrapped-events] insert skipped: %', SQLERRM;
END;
$$;

-- 4) Trigger from wines (additions, stock increases, rating updates)
CREATE OR REPLACE FUNCTION public.trg_wrapped_events_from_wines()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  eff_mode text;
  ctx jsonb;
  qty_delta integer;
  skip_quantity_event boolean;
BEGIN
  eff_mode := public.resolve_wrapped_mode(COALESCE(NEW.user_id, OLD.user_id));

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.quantity, 0) > 0 THEN
      ctx := public.build_wrapped_event_context(
        'wines',
        'wine',
        NEW.name,
        NEW.style,
        NEW.region,
        jsonb_build_object(
          'action', 'insert',
          'wine_id', NEW.id,
          'quantity', NEW.quantity
        )
      );
      PERFORM public.record_wrapped_event(
        NEW.user_id,
        eff_mode,
        NEW.id,
        'added_to_cellar',
        COALESCE(NEW.quantity, 1),
        NEW.current_value,
        NEW.rating,
        ctx
      );
    END IF;

    IF NEW.rating IS NOT NULL THEN
      ctx := public.build_wrapped_event_context(
        'wines',
        'wine',
        NEW.name,
        NEW.style,
        NEW.region,
        jsonb_build_object(
          'action', 'insert_rating',
          'wine_id', NEW.id,
          'rating', NEW.rating
        )
      );
      PERFORM public.record_wrapped_event(
        NEW.user_id,
        eff_mode,
        NEW.id,
        'wine_rated',
        1,
        NEW.current_value,
        NEW.rating,
        ctx
      );
    END IF;

    RETURN NEW;
  END IF;

  skip_quantity_event := current_setting('sommelyx.skip_wrapped_quantity_event', true) = '1';

  IF NEW.rating IS DISTINCT FROM OLD.rating AND NEW.rating IS NOT NULL THEN
    ctx := public.build_wrapped_event_context(
      'wines',
      'wine',
      NEW.name,
      NEW.style,
      NEW.region,
      jsonb_build_object(
        'action', 'rating_update',
        'wine_id', NEW.id,
        'previous_rating', OLD.rating,
        'new_rating', NEW.rating
      )
    );
    PERFORM public.record_wrapped_event(
      NEW.user_id,
      eff_mode,
      NEW.id,
      'wine_rated',
      1,
      NEW.current_value,
      NEW.rating,
      ctx
    );
  END IF;

  IF NOT skip_quantity_event AND COALESCE(NEW.quantity, 0) > COALESCE(OLD.quantity, 0) THEN
    qty_delta := COALESCE(NEW.quantity, 0) - COALESCE(OLD.quantity, 0);
    ctx := public.build_wrapped_event_context(
      'wines',
      'wine',
      NEW.name,
      NEW.style,
      NEW.region,
      jsonb_build_object(
        'action', 'quantity_increase',
        'wine_id', NEW.id,
        'previous_quantity', OLD.quantity,
        'new_quantity', NEW.quantity,
        'delta', qty_delta
      )
    );
    PERFORM public.record_wrapped_event(
      NEW.user_id,
      eff_mode,
      NEW.id,
      'stock_added',
      qty_delta,
      NEW.current_value,
      NEW.rating,
      ctx
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wrapped_events_from_wines ON public.wines;
CREATE TRIGGER trg_wrapped_events_from_wines
  AFTER INSERT OR UPDATE OF quantity, rating ON public.wines
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_wrapped_events_from_wines();

-- 5) Trigger from wine_events (stock changes + opens + commercial exits)
CREATE OR REPLACE FUNCTION public.trg_wrapped_events_from_wine_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  eff_mode text;
  wine_row public.wines%ROWTYPE;
  sale_price numeric;
  ctx jsonb;
BEGIN
  SELECT * INTO wine_row
  FROM public.wines
  WHERE id = NEW.wine_id;

  eff_mode := public.resolve_wrapped_mode(NEW.user_id);

  IF NEW.event_type = 'open' THEN
    ctx := public.build_wrapped_event_context(
      'wine_events',
      'wine',
      wine_row.name,
      wine_row.style,
      wine_row.region,
      jsonb_build_object(
        'action', 'open',
        'source_event_id', NEW.id,
        'previous_quantity', NEW.previous_quantity,
        'new_quantity', NEW.new_quantity,
        'quantity_delta', NEW.quantity_delta,
        'notes', NEW.notes
      )
    );
    PERFORM public.record_wrapped_event(
      NEW.user_id,
      eff_mode,
      NEW.wine_id,
      'bottle_opened',
      COALESCE(NEW.quantity, 1),
      wine_row.current_value,
      wine_row.rating,
      ctx
    );
  ELSIF NEW.event_type IN ('add', 'stock_increase', 'stock_adjustment') THEN
    ctx := public.build_wrapped_event_context(
      'wine_events',
      'wine',
      wine_row.name,
      wine_row.style,
      wine_row.region,
      jsonb_build_object(
        'action', NEW.event_type,
        'source_event_id', NEW.id,
        'previous_quantity', NEW.previous_quantity,
        'new_quantity', NEW.new_quantity,
        'quantity_delta', NEW.quantity_delta,
        'notes', NEW.notes
      )
    );
    PERFORM public.record_wrapped_event(
      NEW.user_id,
      eff_mode,
      NEW.wine_id,
      'stock_added',
      COALESCE(NEW.quantity, 1),
      wine_row.current_value,
      wine_row.rating,
      ctx
    );
  ELSIF NEW.event_type = 'exit' THEN
    sale_price := NULL;
    IF NEW.notes IS NOT NULL THEN
      sale_price := (
        NULLIF(
          replace(COALESCE((regexp_match(NEW.notes, 'R\\$\\s*([0-9]+(?:[\\.,][0-9]+)?)'))[1], ''), ',', '.'),
          ''
        )::numeric
      );
    END IF;

    ctx := public.build_wrapped_event_context(
      'wine_events',
      'sale',
      wine_row.name,
      wine_row.style,
      wine_row.region,
      jsonb_build_object(
        'action', 'exit',
        'source_event_id', NEW.id,
        'previous_quantity', NEW.previous_quantity,
        'new_quantity', NEW.new_quantity,
        'quantity_delta', NEW.quantity_delta,
        'notes', NEW.notes
      )
    );
    PERFORM public.record_wrapped_event(
      NEW.user_id,
      eff_mode,
      NEW.id,
      'sale_completed',
      COALESCE(NEW.quantity, 1),
      sale_price,
      wine_row.rating,
      ctx
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[wrapped-events] wine_events trigger skipped: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wrapped_events_from_wine_events ON public.wine_events;
CREATE TRIGGER trg_wrapped_events_from_wine_events
  AFTER INSERT ON public.wine_events
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_wrapped_events_from_wine_events();

-- 6) Trigger from consumption_log (consumption + rating)
CREATE OR REPLACE FUNCTION public.trg_wrapped_events_from_consumption_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  eff_mode text;
  wine_row public.wines%ROWTYPE;
  entity_uuid uuid;
  ctx jsonb;
BEGIN
  eff_mode := public.resolve_wrapped_mode(NEW.user_id);
  entity_uuid := COALESCE(NEW.wine_id, NEW.id);

  IF NEW.wine_id IS NOT NULL THEN
    SELECT * INTO wine_row
    FROM public.wines
    WHERE id = NEW.wine_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    ctx := public.build_wrapped_event_context(
      'consumption_log',
      'consumption',
      NEW.wine_name,
      NEW.style,
      NEW.region,
      jsonb_build_object(
        'action', 'insert',
        'source', NEW.source,
        'consumed_at', NEW.consumed_at,
        'location', NEW.location,
        'wine_id', NEW.wine_id,
        'consumption_id', NEW.id,
        'tasting_notes', NEW.tasting_notes
      )
    );

    PERFORM public.record_wrapped_event(
      NEW.user_id,
      eff_mode,
      entity_uuid,
      'consumption_logged',
      1,
      NULL,
      NEW.rating,
      ctx
    );

    IF NEW.rating IS NOT NULL THEN
      ctx := public.build_wrapped_event_context(
        'consumption_log',
        'wine',
        NEW.wine_name,
        NEW.style,
        NEW.region,
        jsonb_build_object(
          'action', 'rating_insert',
          'source', NEW.source,
          'consumed_at', NEW.consumed_at,
          'location', NEW.location,
          'wine_id', NEW.wine_id,
          'consumption_id', NEW.id,
          'tasting_notes', NEW.tasting_notes
        )
      );

      PERFORM public.record_wrapped_event(
        NEW.user_id,
        eff_mode,
        entity_uuid,
        'wine_rated',
        1,
        NULL,
        NEW.rating,
        ctx
      );
    END IF;
  ELSIF TG_OP = 'UPDATE'
    AND NEW.rating IS DISTINCT FROM OLD.rating
    AND NEW.rating IS NOT NULL THEN
    ctx := public.build_wrapped_event_context(
      'consumption_log',
      'wine',
      NEW.wine_name,
      NEW.style,
      NEW.region,
      jsonb_build_object(
        'action', 'rating_update',
        'source', NEW.source,
        'consumed_at', NEW.consumed_at,
        'location', NEW.location,
        'wine_id', NEW.wine_id,
        'consumption_id', NEW.id,
        'previous_rating', OLD.rating,
        'new_rating', NEW.rating,
        'tasting_notes', NEW.tasting_notes
      )
    );

    PERFORM public.record_wrapped_event(
      NEW.user_id,
      eff_mode,
      entity_uuid,
      'wine_rated',
      1,
      NULL,
      NEW.rating,
      ctx
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[wrapped-events] consumption_log trigger skipped: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wrapped_events_from_consumption_log ON public.consumption_log;
CREATE TRIGGER trg_wrapped_events_from_consumption_log
  AFTER INSERT OR UPDATE OF rating ON public.consumption_log
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_wrapped_events_from_consumption_log();

-- 7) Trigger from sales table (commercial sales ledger)
CREATE OR REPLACE FUNCTION public.trg_wrapped_events_from_sales()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  eff_mode text;
  wine_row public.wines%ROWTYPE;
  ctx jsonb;
BEGIN
  eff_mode := public.resolve_wrapped_mode(NEW.user_id);

  IF NEW.wine_id IS NOT NULL THEN
    SELECT * INTO wine_row
    FROM public.wines
    WHERE id = NEW.wine_id;
  END IF;

  ctx := public.build_wrapped_event_context(
    'sales',
    'sale',
    NEW.name,
    wine_row.style,
    wine_row.region,
    jsonb_build_object(
      'action', 'insert',
      'sale_id', NEW.id,
      'wine_id', NEW.wine_id,
      'quantity', NEW.quantity,
      'unit_price', NEW.price,
      'total_price', NEW.quantity * NEW.price
    )
  );

  PERFORM public.record_wrapped_event(
    NEW.user_id,
    eff_mode,
    NEW.id,
    'sale_completed',
    COALESCE(NEW.quantity, 1),
    NEW.price,
    NULL,
    ctx
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '[wrapped-events] sales trigger skipped: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wrapped_events_from_sales ON public.sales;
CREATE TRIGGER trg_wrapped_events_from_sales
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_wrapped_events_from_sales();

-- 8) Semestral summary helper (background jobs only)
CREATE OR REPLACE FUNCTION public.refresh_user_semester_summary(
  _user_id uuid,
  _year integer,
  _semester integer,
  _mode text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  period_start date;
  period_end date;
  metrics jsonb;
BEGIN
  IF _semester NOT IN (1, 2) THEN
    RAISE EXCEPTION 'Invalid semester';
  END IF;

  period_start := make_date(_year, CASE WHEN _semester = 1 THEN 1 ELSE 7 END, 1);
  period_end := CASE WHEN _semester = 1 THEN make_date(_year, 7, 1) ELSE make_date(_year + 1, 1, 1) END;

  WITH scoped AS (
    SELECT *
    FROM public.events
    WHERE user_id = _user_id
      AND mode = _mode
      AND created_at >= period_start
      AND created_at < period_end
  ),
  event_counts AS (
    SELECT
      count(*) AS total_events,
      count(*) FILTER (WHERE event_type = 'added_to_cellar') AS added_to_cellar,
      count(*) FILTER (WHERE event_type = 'bottle_opened') AS bottle_opened,
      count(*) FILTER (WHERE event_type = 'wine_rated') AS wine_rated,
      count(*) FILTER (WHERE event_type = 'consumption_logged') AS consumption_logged,
      count(*) FILTER (WHERE event_type = 'sale_completed') AS sale_completed,
      count(*) FILTER (WHERE event_type = 'stock_added') AS stock_added,
      coalesce(sum(quantity) FILTER (WHERE event_type IN ('added_to_cellar', 'stock_added')), 0) AS bottles_added,
      coalesce(sum(quantity) FILTER (WHERE event_type IN ('bottle_opened', 'consumption_logged', 'sale_completed')), 0) AS bottles_used,
      coalesce(sum((quantity * coalesce(price, 0))) FILTER (WHERE event_type = 'sale_completed'), 0) AS revenue_total,
      avg(rating) FILTER (WHERE rating IS NOT NULL) AS avg_rating,
      max(created_at) AS last_event_at,
      count(DISTINCT entity_id) AS unique_entities
    FROM scoped
  )
  SELECT jsonb_build_object(
    'period_start', period_start,
    'period_end', period_end,
    'total_events', total_events,
    'unique_entities', unique_entities,
    'added_to_cellar', added_to_cellar,
    'bottle_opened', bottle_opened,
    'wine_rated', wine_rated,
    'consumption_logged', consumption_logged,
    'sale_completed', sale_completed,
    'stock_added', stock_added,
    'bottles_added', bottles_added,
    'bottles_used', bottles_used,
    'revenue_total', revenue_total,
    'avg_rating', avg_rating,
    'last_event_at', last_event_at
  )
  INTO metrics
  FROM event_counts;

  INSERT INTO public.user_semester_summary (
    user_id,
    year,
    semester,
    mode,
    computed_metrics
  )
  VALUES (
    _user_id,
    _year,
    _semester,
    _mode,
    COALESCE(metrics, '{}'::jsonb)
  )
  ON CONFLICT (user_id, year, semester, mode)
  DO UPDATE SET computed_metrics = EXCLUDED.computed_metrics;
END;
$$;

-- 9) Make the stock RPC set a local guard so direct wine UPDATEs do not duplicate stock_added events.
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
  -- Defense-in-depth: never trust client-supplied _user_id for a SECURITY DEFINER function.
  IF _user_id IS NOT NULL AND _user_id <> actor_user_id THEN
    RAISE EXCEPTION 'User mismatch';
  END IF;

  -- Guard used by wrapped-event triggers so RPC-driven stock mutations do not double-log.
  PERFORM set_config('sommelyx.skip_wrapped_quantity_event', '1', true);

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
      prev_qty,
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

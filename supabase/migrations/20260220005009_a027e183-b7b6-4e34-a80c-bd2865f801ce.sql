
-- =============================================
-- 1) Create hour_mode enum
-- =============================================
CREATE TYPE public.hour_mode AS ENUM ('open', 'closed', 'on_request');

-- =============================================
-- 2) business_hours: weekly schedule (multi-interval per day)
-- =============================================
CREATE TABLE public.business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  day_of_week public.day_of_week NOT NULL,
  mode public.hour_mode NOT NULL DEFAULT 'open',
  start_time time NOT NULL DEFAULT '09:00',
  end_time time NOT NULL DEFAULT '17:00',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bh_time_check CHECK (start_time < end_time)
);

CREATE INDEX idx_business_hours_biz ON public.business_hours(business_id);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bh_select_public" ON public.business_hours FOR SELECT USING (true);
CREATE POLICY "bh_manage_admin" ON public.business_hours FOR ALL USING (is_business_admin(auth.uid(), business_id));

-- =============================================
-- 3) business_date_overrides: date-specific exceptions
-- =============================================
CREATE TABLE public.business_date_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  override_date date NOT NULL,
  mode public.hour_mode NOT NULL DEFAULT 'closed',
  start_time time,
  end_time time,
  label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bdo_time_check CHECK (
    (mode = 'closed') OR (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

CREATE UNIQUE INDEX idx_bdo_biz_date ON public.business_date_overrides(business_id, override_date, COALESCE(start_time, '00:00'));
CREATE INDEX idx_bdo_biz ON public.business_date_overrides(business_id);

ALTER TABLE public.business_date_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bdo_select_public" ON public.business_date_overrides FOR SELECT USING (true);
CREATE POLICY "bdo_manage_admin" ON public.business_date_overrides FOR ALL USING (is_business_admin(auth.uid(), business_id));

-- =============================================
-- 4) business_quick_links
-- =============================================
CREATE TABLE public.business_quick_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  label text NOT NULL,
  url text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_bql_biz ON public.business_quick_links(business_id);

ALTER TABLE public.business_quick_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bql_select_public" ON public.business_quick_links FOR SELECT USING (true);
CREATE POLICY "bql_manage_admin" ON public.business_quick_links FOR ALL USING (is_business_admin(auth.uid(), business_id));

-- =============================================
-- 5) RPC: rpc_get_public_business_info
-- =============================================
CREATE OR REPLACE FUNCTION public.rpc_get_public_business_info(_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  biz record;
BEGIN
  SELECT id, name, slug, address, phone, email, timezone, logo_url,
         lead_time_minutes, max_days_ahead, cancellation_hours
  INTO biz FROM businesses WHERE id = _business_id;

  IF biz IS NULL THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
    'business', jsonb_build_object(
      'id', biz.id, 'name', biz.name, 'slug', biz.slug,
      'address', biz.address, 'phone', biz.phone, 'email', biz.email,
      'timezone', biz.timezone, 'logo_url', biz.logo_url,
      'lead_time_minutes', biz.lead_time_minutes,
      'max_days_ahead', biz.max_days_ahead,
      'cancellation_hours', biz.cancellation_hours
    ),
    'hours', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'day_of_week', bh.day_of_week, 'mode', bh.mode,
        'start_time', bh.start_time, 'end_time', bh.end_time, 'sort_order', bh.sort_order
      ) ORDER BY bh.sort_order)
      FROM business_hours bh WHERE bh.business_id = _business_id
    ), '[]'::jsonb),
    'overrides', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'override_date', bdo.override_date, 'mode', bdo.mode,
        'start_time', bdo.start_time, 'end_time', bdo.end_time, 'label', bdo.label
      ) ORDER BY bdo.override_date)
      FROM business_date_overrides bdo
      WHERE bdo.business_id = _business_id AND bdo.override_date >= CURRENT_DATE
    ), '[]'::jsonb),
    'quick_links', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', ql.id, 'label', ql.label, 'url', ql.url, 'sort_order', ql.sort_order
      ) ORDER BY ql.sort_order)
      FROM business_quick_links ql WHERE ql.business_id = _business_id
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

-- =============================================
-- 6) RPC: rpc_is_open_now
-- =============================================
CREATE OR REPLACE FUNCTION public.rpc_is_open_now(_business_id uuid, _ts timestamptz DEFAULT now())
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tz text;
  local_ts timestamp;
  local_date date;
  local_time time;
  dow text;
  ovr record;
  bh record;
  is_open boolean := false;
  current_mode text := 'closed';
BEGIN
  SELECT timezone INTO tz FROM businesses WHERE id = _business_id;
  IF tz IS NULL THEN RETURN jsonb_build_object('is_open', false, 'mode', 'closed'); END IF;

  local_ts := _ts AT TIME ZONE tz;
  local_date := local_ts::date;
  local_time := local_ts::time;
  dow := trim(to_char(local_ts, 'day'));

  -- Check date override first
  SELECT mode, start_time, end_time INTO ovr
  FROM business_date_overrides
  WHERE business_id = _business_id AND override_date = local_date
    AND (mode = 'closed' OR (start_time <= local_time AND end_time > local_time))
  ORDER BY CASE WHEN mode = 'closed' THEN 0 ELSE 1 END
  LIMIT 1;

  IF ovr IS NOT NULL THEN
    RETURN jsonb_build_object('is_open', ovr.mode = 'open', 'mode', ovr.mode);
  END IF;

  -- Check if any override exists for today (closed with no time range)
  IF EXISTS (SELECT 1 FROM business_date_overrides WHERE business_id = _business_id AND override_date = local_date AND mode = 'closed') THEN
    RETURN jsonb_build_object('is_open', false, 'mode', 'closed');
  END IF;

  -- Check weekly hours
  SELECT mode, start_time, end_time INTO bh
  FROM business_hours
  WHERE business_id = _business_id AND day_of_week::text = dow
    AND start_time <= local_time AND end_time > local_time
    AND mode = 'open'
  LIMIT 1;

  IF bh IS NOT NULL THEN
    RETURN jsonb_build_object('is_open', true, 'mode', 'open');
  END IF;

  -- Check if on_request
  SELECT mode INTO bh
  FROM business_hours
  WHERE business_id = _business_id AND day_of_week::text = dow
    AND mode = 'on_request'
  LIMIT 1;

  IF bh IS NOT NULL THEN
    RETURN jsonb_build_object('is_open', false, 'mode', 'on_request');
  END IF;

  RETURN jsonb_build_object('is_open', false, 'mode', 'closed');
END;
$$;

-- =============================================
-- 7) RPC: rpc_next_opening
-- =============================================
CREATE OR REPLACE FUNCTION public.rpc_next_opening(_business_id uuid, _ts timestamptz DEFAULT now())
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tz text;
  local_ts timestamp;
  check_date date;
  check_dow text;
  bh record;
  ovr record;
  i int;
BEGIN
  SELECT timezone INTO tz FROM businesses WHERE id = _business_id;
  IF tz IS NULL THEN RETURN NULL; END IF;

  local_ts := _ts AT TIME ZONE tz;

  FOR i IN 0..13 LOOP
    check_date := (local_ts + (i || ' days')::interval)::date;
    check_dow := trim(to_char(check_date, 'day'));

    -- Check override for this date
    SELECT mode, start_time INTO ovr
    FROM business_date_overrides
    WHERE business_id = _business_id AND override_date = check_date AND mode = 'open'
    ORDER BY start_time
    LIMIT 1;

    IF ovr IS NOT NULL THEN
      IF i = 0 AND ovr.start_time <= local_ts::time THEN
        CONTINUE;
      END IF;
      RETURN jsonb_build_object(
        'date', check_date,
        'time', ovr.start_time,
        'datetime', (check_date + ovr.start_time) AT TIME ZONE tz
      );
    END IF;

    -- Skip if closed override
    IF EXISTS (SELECT 1 FROM business_date_overrides WHERE business_id = _business_id AND override_date = check_date AND mode IN ('closed', 'on_request')) THEN
      CONTINUE;
    END IF;

    -- Check weekly
    SELECT start_time INTO bh
    FROM business_hours
    WHERE business_id = _business_id AND day_of_week::text = check_dow AND mode = 'open'
    ORDER BY start_time
    LIMIT 1;

    IF bh IS NOT NULL THEN
      IF i = 0 AND bh.start_time <= local_ts::time THEN
        -- Find next interval today
        SELECT start_time INTO bh
        FROM business_hours
        WHERE business_id = _business_id AND day_of_week::text = check_dow AND mode = 'open'
          AND start_time > local_ts::time
        ORDER BY start_time
        LIMIT 1;

        IF bh IS NULL THEN CONTINUE; END IF;
      END IF;

      RETURN jsonb_build_object(
        'date', check_date,
        'time', bh.start_time,
        'datetime', (check_date + bh.start_time) AT TIME ZONE tz
      );
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

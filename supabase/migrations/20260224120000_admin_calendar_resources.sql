-- Separate calendar visibility from service bookability for employees/resources
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS show_in_calendar boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_bookable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_receive_service_bookings boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_create_private_notes boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS order_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS color text;

-- Backfill admin/owner memberships: visible in calendar but not bookable for services
UPDATE public.employees e
SET
  show_in_calendar = true,
  is_bookable = false,
  can_receive_service_bookings = false,
  can_create_private_notes = true
FROM public.memberships m
WHERE m.profile_id = e.profile_id
  AND m.business_id = e.business_id
  AND m.role IN ('admin', 'owner');

CREATE INDEX IF NOT EXISTS idx_employees_business_calendar_order
  ON public.employees (business_id, show_in_calendar, order_index, display_name);

CREATE INDEX IF NOT EXISTS idx_employees_business_bookable
  ON public.employees (business_id, is_bookable, can_receive_service_bookings, is_active);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'calendar_event_type' AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.calendar_event_type AS ENUM ('service_booking', 'blocked_time', 'private_note', 'internal_event', 'admin_booking_note');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  resource_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  type public.calendar_event_type NOT NULL,
  title text NOT NULL,
  note text,
  visibility text NOT NULL DEFAULT 'private',
  linked_appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  created_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calendar_events_time_check CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_business_resource_start
  ON public.calendar_events (business_id, resource_id, start_at);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calendar_events_select_member" ON public.calendar_events;
CREATE POLICY "calendar_events_select_member"
  ON public.calendar_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.business_id = calendar_events.business_id
        AND m.profile_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "calendar_events_manage_admin" ON public.calendar_events;
CREATE POLICY "calendar_events_manage_admin"
  ON public.calendar_events FOR ALL
  USING (public.is_admin_of_business(calendar_events.business_id))
  WITH CHECK (public.is_admin_of_business(calendar_events.business_id));

CREATE OR REPLACE FUNCTION public.touch_calendar_events_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calendar_events_touch_updated_at ON public.calendar_events;
CREATE TRIGGER trg_calendar_events_touch_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW EXECUTE FUNCTION public.touch_calendar_events_updated_at();

CREATE OR REPLACE FUNCTION public.validate_appointment_bookable_provider()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  provider record;
BEGIN
  SELECT is_active, is_bookable, can_receive_service_bookings
  INTO provider
  FROM public.employees
  WHERE id = NEW.employee_id
    AND business_id = NEW.business_id;

  IF provider IS NULL THEN
    RAISE EXCEPTION 'Provider not found in business';
  END IF;

  IF provider.is_active IS DISTINCT FROM true
    OR provider.is_bookable IS DISTINCT FROM true
    OR provider.can_receive_service_bookings IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Selected provider is not bookable for service reservations';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_appointment_bookable_provider ON public.appointments;
CREATE TRIGGER trg_validate_appointment_bookable_provider
BEFORE INSERT OR UPDATE OF employee_id, business_id ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.validate_appointment_bookable_provider();

-- Reservation email notification plumbing

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;

CREATE TABLE IF NOT EXISTS public.user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{"emailNotificationsEnabled": true, "reservationCreated": true, "reservationUpdated": true, "reservationCancelled": true}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, profile_id)
);

CREATE TABLE IF NOT EXISTS public.reservation_notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('reservation.created','reservation.updated','reservation.cancelled')),
  recipient_email TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('admin','employee','customer')),
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reservation_notification_logs_appointment ON public.reservation_notification_logs(appointment_id, created_at DESC);

ALTER TABLE public.user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_notification_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_notification_settings_select_own" ON public.user_notification_settings;
CREATE POLICY "user_notification_settings_select_own"
  ON public.user_notification_settings FOR SELECT
  USING (profile_id = public.current_profile_id() OR public.is_business_admin(public.current_profile_id(), business_id));

DROP POLICY IF EXISTS "user_notification_settings_manage_own" ON public.user_notification_settings;
CREATE POLICY "user_notification_settings_manage_own"
  ON public.user_notification_settings FOR ALL
  USING (profile_id = public.current_profile_id() OR public.is_business_admin(public.current_profile_id(), business_id))
  WITH CHECK (profile_id = public.current_profile_id() OR public.is_business_admin(public.current_profile_id(), business_id));

DROP POLICY IF EXISTS "reservation_notification_logs_select_admin" ON public.reservation_notification_logs;
CREATE POLICY "reservation_notification_logs_select_admin"
  ON public.reservation_notification_logs FOR SELECT
  USING (public.is_business_admin(public.current_profile_id(), business_id));

CREATE OR REPLACE FUNCTION public.queue_reservation_email_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  event_type TEXT;
  supabase_url TEXT;
  service_role_key TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_type := 'reservation.created';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status THEN
    event_type := 'reservation.cancelled';
  ELSIF TG_OP = 'UPDATE' THEN
    event_type := 'reservation.updated';
  ELSE
    RETURN NEW;
  END IF;

  supabase_url := current_setting('app.settings.supabase_url', true);
  service_role_key := current_setting('app.settings.service_role_key', true);

  IF supabase_url IS NULL OR service_role_key IS NULL THEN
    RAISE WARNING 'Notification webhook skipped: missing app.settings.supabase_url or app.settings.service_role_key';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/send-booking-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key,
      'apikey', service_role_key
    ),
    body := jsonb_build_object(
      'appointment_id', NEW.id,
      'business_id', NEW.business_id,
      'event_type', event_type
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'queue_reservation_email_notification failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_queue_reservation_email_notification ON public.appointments;
CREATE TRIGGER trg_queue_reservation_email_notification
AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.queue_reservation_email_notification();

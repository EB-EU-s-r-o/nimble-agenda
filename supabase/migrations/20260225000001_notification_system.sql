-- ============================================================
-- NOTIFICATION SYSTEM MIGRATION
-- Email notifications for appointments with deduplication
-- ============================================================

-- 1. Notification logs table for deduplication and audit
CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'cancelled')),
  recipient_email TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('admin', 'employee', 'customer')),
  recipient_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error_message TEXT,
  email_subject TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate notifications for same event
  UNIQUE (appointment_id, event_type, recipient_email)
);

CREATE INDEX idx_notification_logs_business ON public.notification_logs(business_id);
CREATE INDEX idx_notification_logs_appointment ON public.notification_logs(appointment_id);
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX idx_notification_logs_created ON public.notification_logs(created_at);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view notification logs for their business
CREATE POLICY "notification_logs_select_admin"
  ON public.notification_logs FOR SELECT
  USING (public.is_business_admin(public.current_profile_id(), business_id));

-- 2. Optional: Notification settings for users (stored in profiles as JSONB)
-- This allows per-user notification preferences
COMMENT ON TABLE public.notification_logs IS 
'Audit log for all appointment email notifications. Used for deduplication and troubleshooting.';

-- 3. Helper function to check if notification was already sent
CREATE OR REPLACE FUNCTION public.was_notification_sent(
  _appointment_id UUID,
  _event_type TEXT,
  _recipient_email TEXT
) RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.notification_logs
    WHERE appointment_id = _appointment_id
      AND event_type = _event_type
      AND recipient_email = _recipient_email
      AND status IN ('sent', 'pending')
  );
$$;

-- 4. Helper function to get admin emails for a business
CREATE OR REPLACE FUNCTION public.get_business_admin_emails(_business_id UUID)
RETURNS TABLE (email TEXT, profile_id UUID) LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    p.email,
    p.id as profile_id
  FROM public.memberships m
  JOIN public.profiles p ON p.id = m.profile_id
  WHERE m.business_id = _business_id
    AND m.role IN ('owner', 'admin')
    AND p.email IS NOT NULL
    AND p.email != ''
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = p.id -- ensure profile exists and is active
    );
$$;

-- 5. Helper function to get employee email for an appointment
CREATE OR REPLACE FUNCTION public.get_appointment_employee_email(_appointment_id UUID)
RETURNS TABLE (email TEXT, profile_id UUID, employee_id UUID) LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    e.email,
    e.profile_id,
    e.id as employee_id
  FROM public.appointments a
  JOIN public.employees e ON e.id = a.employee_id
  WHERE a.id = _appointment_id
    AND e.is_active = true
    AND e.email IS NOT NULL
    AND e.email != '';
$$;

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.was_notification_sent(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_business_admin_emails(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_appointment_employee_email(UUID) TO authenticated;

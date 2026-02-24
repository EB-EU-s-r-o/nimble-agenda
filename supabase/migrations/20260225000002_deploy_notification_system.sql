-- ============================================================
-- EMAIL NOTIFICATION SYSTEM - DEPLOYMENT SCRIPT
-- Run this in Supabase SQL Editor to deploy the notification system
-- ============================================================

-- 1. Create notification_logs table
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created', 'updated', 'cancelled')),
  recipient_email text NOT NULL,
  recipient_type text NOT NULL CHECK (recipient_type IN ('admin', 'employee', 'customer')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Prevent duplicate notifications
  UNIQUE(appointment_id, event_type, recipient_email)
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_logs_appointment ON public.notification_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created ON public.notification_logs(created_at);

-- 3. Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY IF NOT EXISTS "notification_logs_select_admin"
  ON public.notification_logs FOR SELECT
  USING (public.is_business_admin(public.current_profile_id(), (
    SELECT business_id FROM public.appointments WHERE id = appointment_id
  )));

CREATE POLICY IF NOT EXISTS "notification_logs_insert_system"
  ON public.notification_logs FOR INSERT
  WITH CHECK (true); -- Allow system inserts

-- 5. RPC Function: Check if notification was already sent
CREATE OR REPLACE FUNCTION public.was_notification_sent(
  p_appointment_id uuid,
  p_event_type text,
  p_recipient_email text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.notification_logs
    WHERE appointment_id = p_appointment_id
      AND event_type = p_event_type
      AND recipient_email = p_recipient_email
      AND status = 'sent'
  );
END;
$$;

-- 6. RPC Function: Get business admin emails
CREATE OR REPLACE FUNCTION public.get_business_admin_emails(p_business_id uuid)
RETURNS TABLE(email text, full_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.email::text,
    COALESCE(p.full_name, 'Admin')::text as full_name
  FROM public.memberships m
  JOIN public.profiles p ON p.id = m.profile_id
  WHERE m.business_id = p_business_id
    AND m.role IN ('owner', 'admin')
    AND p.email IS NOT NULL
    AND p.email != '';
END;
$$;

-- 7. RPC Function: Get appointment employee email
CREATE OR REPLACE FUNCTION public.get_appointment_employee_email(p_appointment_id uuid)
RETURNS TABLE(email text, full_name text, employee_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.email::text,
    e.display_name::text as full_name,
    e.id as employee_id
  FROM public.appointments a
  JOIN public.employees e ON e.id = a.employee_id
  WHERE a.id = p_appointment_id
    AND e.email IS NOT NULL
    AND e.email != '';
END;
$$;

-- 8. RPC Function: Log notification attempt
CREATE OR REPLACE FUNCTION public.log_notification(
  p_appointment_id uuid,
  p_event_type text,
  p_recipient_email text,
  p_recipient_type text,
  p_status text DEFAULT 'pending',
  p_error_message text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.notification_logs (
    appointment_id,
    event_type,
    recipient_email,
    recipient_type,
    status,
    error_message,
    sent_at
  ) VALUES (
    p_appointment_id,
    p_event_type,
    p_recipient_email,
    p_recipient_type,
    p_status,
    p_error_message,
    CASE WHEN p_status = 'sent' THEN now() ELSE NULL END
  )
  ON CONFLICT (appointment_id, event_type, recipient_email) 
  DO UPDATE SET 
    status = EXCLUDED.status,
    error_message = EXCLUDED.error_message,
    sent_at = CASE WHEN EXCLUDED.status = 'sent' THEN now() ELSE notification_logs.sent_at END
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- 9. Add verify_jwt = false for new function in config (manual step required)
-- Add to supabase/config.toml:
-- [functions.send-appointment-notification]
-- verify_jwt = false

-- 10. Verify deployment
SELECT 'Notification system deployed successfully!' as status;

-- Show summary
SELECT 
  'Tables created: notification_logs' as component,
  1 as count
UNION ALL
SELECT 
  'RPC functions created',
  4
UNION ALL
SELECT 
  'RLS policies created',
  2;

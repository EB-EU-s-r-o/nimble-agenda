
-- Drop all existing restrictive policies on appointments
DROP POLICY IF EXISTS "appointments_manage_admin" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_admin" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_customer_own" ON public.appointments;
DROP POLICY IF EXISTS "appointments_select_employee_own" ON public.appointments;
DROP POLICY IF EXISTS "appointments_update_employee_own" ON public.appointments;

-- Recreate as PERMISSIVE (default) policies
CREATE POLICY "appointments_select_admin"
  ON public.appointments FOR SELECT
  USING (is_business_admin(auth.uid(), business_id));

CREATE POLICY "appointments_select_employee_own"
  ON public.appointments FOR SELECT
  USING (is_business_employee(auth.uid(), business_id) AND employee_id = get_employee_id(auth.uid(), business_id));

CREATE POLICY "appointments_select_customer_own"
  ON public.appointments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM customers c
    WHERE c.id = appointments.customer_id AND c.profile_id = auth.uid()
  ));

CREATE POLICY "appointments_manage_admin"
  ON public.appointments FOR ALL
  USING (is_business_admin(auth.uid(), business_id));

CREATE POLICY "appointments_update_employee_own"
  ON public.appointments FOR UPDATE
  USING (is_business_employee(auth.uid(), business_id) AND employee_id = get_employee_id(auth.uid(), business_id));

-- Harden employee scoping for calendar/reservations and offline sync related reads/writes.

CREATE OR REPLACE FUNCTION public.get_employee_id(_user_id UUID, _business_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id
  FROM public.employees
  WHERE profile_id = _user_id
    AND business_id = _business_id
    AND is_active = true
  LIMIT 1
$$;

-- EMPLOYEES: employee can only read own employee row, admin still sees all business employees.
DROP POLICY IF EXISTS "employees_select_member_or_public" ON public.employees;
CREATE POLICY "employees_select_member_or_public"
  ON public.employees FOR SELECT
  USING (
    public.is_business_admin(public.current_profile_id(), business_id)
    OR id = public.get_employee_id(public.current_profile_id(), business_id)
  );

-- SCHEDULES: employee can only read own schedule; management still admin-only.
DROP POLICY IF EXISTS "schedules_select_member" ON public.schedules;
CREATE POLICY "schedules_select_member"
  ON public.schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = schedules.employee_id
        AND (
          public.is_business_admin(public.current_profile_id(), e.business_id)
          OR e.id = public.get_employee_id(public.current_profile_id(), e.business_id)
        )
    )
  );

-- APPOINTMENTS: employee insert/update only for own employee_id.
DROP POLICY IF EXISTS "appointments_insert_employee_own" ON public.appointments;
CREATE POLICY "appointments_insert_employee_own"
  ON public.appointments FOR INSERT
  WITH CHECK (
    public.is_business_employee(public.current_profile_id(), business_id)
    AND employee_id = public.get_employee_id(public.current_profile_id(), business_id)
  );

DROP POLICY IF EXISTS "appointments_update_employee_own" ON public.appointments;
CREATE POLICY "appointments_update_employee_own"
  ON public.appointments FOR UPDATE
  USING (
    public.is_business_employee(public.current_profile_id(), business_id)
    AND employee_id = public.get_employee_id(public.current_profile_id(), business_id)
  )
  WITH CHECK (
    employee_id = public.get_employee_id(public.current_profile_id(), business_id)
  );

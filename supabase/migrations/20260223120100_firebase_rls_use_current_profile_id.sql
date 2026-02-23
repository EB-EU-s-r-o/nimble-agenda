-- RLS: nahradenie auth.uid() za current_profile_id() aby fungoval aj Firebase JWT.
-- Spustiť až po 20260223120000_firebase_auth.sql (funkcia current_profile_id musí existovať).

-- PROFILES
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (public.current_profile_id() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (public.current_profile_id() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (public.current_profile_id() = id);

-- USER_ROLES
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT USING (public.current_profile_id() = user_id);

-- BUSINESSES
DROP POLICY IF EXISTS "businesses_select_member" ON public.businesses;
CREATE POLICY "businesses_select_member" ON public.businesses FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.memberships WHERE business_id = businesses.id AND profile_id = public.current_profile_id()));
DROP POLICY IF EXISTS "businesses_update_admin" ON public.businesses;
CREATE POLICY "businesses_update_admin" ON public.businesses FOR UPDATE USING (public.is_business_admin(public.current_profile_id(), id));

-- MEMBERSHIPS
DROP POLICY IF EXISTS "memberships_select_own" ON public.memberships;
CREATE POLICY "memberships_select_own" ON public.memberships FOR SELECT
  USING (profile_id = public.current_profile_id() OR public.is_business_admin(public.current_profile_id(), business_id));
DROP POLICY IF EXISTS "memberships_manage_admin" ON public.memberships;
CREATE POLICY "memberships_manage_admin" ON public.memberships FOR ALL USING (public.is_business_admin(public.current_profile_id(), business_id));

-- SERVICES
DROP POLICY IF EXISTS "services_select_member" ON public.services;
CREATE POLICY "services_select_member" ON public.services FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.memberships WHERE business_id = services.business_id AND profile_id = public.current_profile_id())
    OR is_active = true
  );
DROP POLICY IF EXISTS "services_manage_admin" ON public.services;
CREATE POLICY "services_manage_admin" ON public.services FOR ALL USING (public.is_business_admin(public.current_profile_id(), business_id));

-- EMPLOYEES
DROP POLICY IF EXISTS "employees_select_member_or_public" ON public.employees;
CREATE POLICY "employees_select_member_or_public" ON public.employees FOR SELECT
  USING (
    is_active = true
    OR EXISTS (SELECT 1 FROM public.memberships WHERE business_id = employees.business_id AND profile_id = public.current_profile_id())
  );
DROP POLICY IF EXISTS "employees_manage_admin" ON public.employees;
CREATE POLICY "employees_manage_admin" ON public.employees FOR ALL USING (public.is_business_admin(public.current_profile_id(), business_id));

-- SCHEDULES
DROP POLICY IF EXISTS "schedules_manage_admin" ON public.schedules;
CREATE POLICY "schedules_manage_admin" ON public.schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = schedules.employee_id AND public.is_business_admin(public.current_profile_id(), e.business_id)
    )
  );

-- CUSTOMERS
DROP POLICY IF EXISTS "customers_select_admin" ON public.customers;
CREATE POLICY "customers_select_admin" ON public.customers FOR SELECT
  USING (public.is_business_admin(public.current_profile_id(), business_id) OR public.is_business_employee(public.current_profile_id(), business_id));
DROP POLICY IF EXISTS "customers_select_own" ON public.customers;
CREATE POLICY "customers_select_own" ON public.customers FOR SELECT USING (profile_id = public.current_profile_id());
DROP POLICY IF EXISTS "customers_manage_admin" ON public.customers;
CREATE POLICY "customers_manage_admin" ON public.customers FOR ALL USING (public.is_business_admin(public.current_profile_id(), business_id));

-- APPOINTMENTS
DROP POLICY IF EXISTS "appointments_select_admin" ON public.appointments;
CREATE POLICY "appointments_select_admin" ON public.appointments FOR SELECT USING (public.is_business_admin(public.current_profile_id(), business_id));
DROP POLICY IF EXISTS "appointments_select_employee_own" ON public.appointments;
CREATE POLICY "appointments_select_employee_own" ON public.appointments FOR SELECT
  USING (
    public.is_business_employee(public.current_profile_id(), business_id)
    AND employee_id = public.get_employee_id(public.current_profile_id(), business_id)
  );
DROP POLICY IF EXISTS "appointments_select_customer_own" ON public.appointments;
CREATE POLICY "appointments_select_customer_own" ON public.appointments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = appointments.customer_id AND c.profile_id = public.current_profile_id()));
DROP POLICY IF EXISTS "appointments_manage_admin" ON public.appointments;
CREATE POLICY "appointments_manage_admin" ON public.appointments FOR ALL USING (public.is_business_admin(public.current_profile_id(), business_id));
DROP POLICY IF EXISTS "appointments_update_employee_own" ON public.appointments;
CREATE POLICY "appointments_update_employee_own" ON public.appointments FOR UPDATE
  USING (
    public.is_business_employee(public.current_profile_id(), business_id)
    AND employee_id = public.get_employee_id(public.current_profile_id(), business_id)
  );

-- ONBOARDING_ANSWERS
DROP POLICY IF EXISTS "onboarding_manage_admin" ON public.onboarding_answers;
CREATE POLICY "onboarding_manage_admin" ON public.onboarding_answers FOR ALL USING (public.is_business_admin(public.current_profile_id(), business_id));

-- BOOKING_CLAIMS
DROP POLICY IF EXISTS "booking_claims_select_own_email" ON public.booking_claims;
CREATE POLICY "booking_claims_select_own_email" ON public.booking_claims FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = public.current_profile_id() AND p.email = booking_claims.email));

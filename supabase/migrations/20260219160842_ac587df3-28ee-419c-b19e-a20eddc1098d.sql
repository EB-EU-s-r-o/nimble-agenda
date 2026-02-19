
-- ============================================================
-- BOOKING SYSTEM — Full Schema Migration
-- ============================================================

-- 1. ENUMS
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'employee', 'customer');
CREATE TYPE public.appointment_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');
CREATE TYPE public.day_of_week AS ENUM ('monday','tuesday','wednesday','thursday','friday','saturday','sunday');

-- 2. PROFILES (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. USER_ROLES (separate table — no roles on profiles!)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 4. BUSINESSES
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  address TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'Europe/Bratislava',
  lead_time_minutes INT NOT NULL DEFAULT 60,
  max_days_ahead INT NOT NULL DEFAULT 60,
  cancellation_hours INT NOT NULL DEFAULT 24,
  opening_hours JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. MEMBERSHIPS (links profiles to businesses with role)
CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'employee',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, profile_id)
);

-- 6. SERVICES
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name_sk TEXT NOT NULL,
  description_sk TEXT,
  duration_minutes INT NOT NULL DEFAULT 30,
  buffer_minutes INT NOT NULL DEFAULT 0,
  price NUMERIC(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. EMPLOYEES
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. SCHEDULES (recurring weekly availability per employee)
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  day_of_week day_of_week NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, day_of_week)
);

-- 9. CUSTOMERS
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, email)
);

-- 10. APPOINTMENTS
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT appointment_times_valid CHECK (end_at > start_at)
);

-- 11. ONBOARDING_ANSWERS
CREATE TABLE public.onboarding_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  step INT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (business_id, step)
);

-- 12. BOOKING_CLAIMS (for linking anonymous bookings to accounts)
CREATE TABLE public.booking_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_appointments_business ON public.appointments(business_id);
CREATE INDEX idx_appointments_employee ON public.appointments(employee_id);
CREATE INDEX idx_appointments_customer ON public.appointments(customer_id);
CREATE INDEX idx_appointments_start_at ON public.appointments(start_at);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_memberships_profile ON public.memberships(profile_id);
CREATE INDEX idx_memberships_business ON public.memberships(business_id);
CREATE INDEX idx_schedules_employee ON public.schedules(employee_id);
CREATE INDEX idx_booking_claims_token ON public.booking_claims(token_hash);
CREATE INDEX idx_booking_claims_email ON public.booking_claims(email);

-- ============================================================
-- SECURITY DEFINER FUNCTIONS (prevent RLS recursion)
-- ============================================================

-- Check if user has a global role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Check if user is owner or admin of a business
CREATE OR REPLACE FUNCTION public.is_business_admin(_user_id UUID, _business_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE profile_id = _user_id
      AND business_id = _business_id
      AND role IN ('owner', 'admin')
  )
$$;

-- Check if user is employee of a business
CREATE OR REPLACE FUNCTION public.is_business_employee(_user_id UUID, _business_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE profile_id = _user_id
      AND business_id = _business_id
      AND role = 'employee'
  )
$$;

-- Get business_id for an employee (by profile_id)
CREATE OR REPLACE FUNCTION public.get_employee_id(_user_id UUID, _business_id UUID)
RETURNS UUID LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.employees
  WHERE profile_id = _user_id AND business_id = _business_id
  LIMIT 1
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- USER_ROLES
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- BUSINESSES (admins/owners can manage, others can read if member)
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "businesses_select_member" ON public.businesses FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.memberships WHERE business_id = businesses.id AND profile_id = auth.uid())
  );
CREATE POLICY "businesses_update_admin" ON public.businesses FOR UPDATE
  USING (public.is_business_admin(auth.uid(), id));
CREATE POLICY "businesses_insert_owner" ON public.businesses FOR INSERT
  WITH CHECK (true); -- newly created; owner added via trigger

-- MEMBERSHIPS
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memberships_select_own" ON public.memberships FOR SELECT
  USING (profile_id = auth.uid() OR public.is_business_admin(auth.uid(), business_id));
CREATE POLICY "memberships_manage_admin" ON public.memberships FOR ALL
  USING (public.is_business_admin(auth.uid(), business_id));

-- SERVICES (readable by all members, writable by admin/owner)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_select_member" ON public.services FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.memberships WHERE business_id = services.business_id AND profile_id = auth.uid())
    OR is_active = true -- public can read active services for booking
  );
CREATE POLICY "services_manage_admin" ON public.services FOR ALL
  USING (public.is_business_admin(auth.uid(), business_id));

-- EMPLOYEES
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees_select_member_or_public" ON public.employees FOR SELECT
  USING (
    is_active = true
    OR EXISTS (SELECT 1 FROM public.memberships WHERE business_id = employees.business_id AND profile_id = auth.uid())
  );
CREATE POLICY "employees_manage_admin" ON public.employees FOR ALL
  USING (public.is_business_admin(auth.uid(), business_id));

-- SCHEDULES
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedules_select_all" ON public.schedules FOR SELECT USING (true);
CREATE POLICY "schedules_manage_admin" ON public.schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = schedules.employee_id
        AND public.is_business_admin(auth.uid(), e.business_id)
    )
  );

-- CUSTOMERS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_select_admin" ON public.customers FOR SELECT
  USING (public.is_business_admin(auth.uid(), business_id) OR public.is_business_employee(auth.uid(), business_id));
CREATE POLICY "customers_select_own" ON public.customers FOR SELECT
  USING (profile_id = auth.uid());
CREATE POLICY "customers_manage_admin" ON public.customers FOR ALL
  USING (public.is_business_admin(auth.uid(), business_id));

-- APPOINTMENTS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appointments_select_admin" ON public.appointments FOR SELECT
  USING (public.is_business_admin(auth.uid(), business_id));
CREATE POLICY "appointments_select_employee_own" ON public.appointments FOR SELECT
  USING (
    public.is_business_employee(auth.uid(), business_id)
    AND employee_id = public.get_employee_id(auth.uid(), business_id)
  );
CREATE POLICY "appointments_select_customer_own" ON public.appointments FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.customers c WHERE c.id = appointments.customer_id AND c.profile_id = auth.uid())
  );
CREATE POLICY "appointments_manage_admin" ON public.appointments FOR ALL
  USING (public.is_business_admin(auth.uid(), business_id));
CREATE POLICY "appointments_update_employee_own" ON public.appointments FOR UPDATE
  USING (
    public.is_business_employee(auth.uid(), business_id)
    AND employee_id = public.get_employee_id(auth.uid(), business_id)
  );

-- ONBOARDING_ANSWERS
ALTER TABLE public.onboarding_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_manage_admin" ON public.onboarding_answers FOR ALL
  USING (public.is_business_admin(auth.uid(), business_id));

-- BOOKING_CLAIMS (managed by edge function with service role)
ALTER TABLE public.booking_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "booking_claims_select_own_email" ON public.booking_claims FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.email = booking_claims.email)
  );

-- ============================================================
-- TRIGGERS: auto-create profile on signup, timestamps
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- SEED DEMO DATA
-- ============================================================

-- Demo business
INSERT INTO public.businesses (id, name, slug, address, phone, timezone, lead_time_minutes, max_days_ahead, cancellation_hours, opening_hours)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Papi Hair Studio',
  'papi-hair',
  'Hlavná 15, Bratislava',
  '+421 900 123 456',
  'Europe/Bratislava',
  60,
  60,
  24,
  '{"monday":{"open":true,"start":"09:00","end":"18:00"},"tuesday":{"open":true,"start":"09:00","end":"18:00"},"wednesday":{"open":true,"start":"09:00","end":"18:00"},"thursday":{"open":true,"start":"09:00","end":"20:00"},"friday":{"open":true,"start":"09:00","end":"18:00"},"saturday":{"open":true,"start":"09:00","end":"14:00"},"sunday":{"open":false,"start":"09:00","end":"18:00"}}'
);

-- Demo services
INSERT INTO public.services (id, business_id, name_sk, description_sk, duration_minutes, buffer_minutes, price) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Strihanie vlasov', 'Profesionálny strih vlasov', 45, 10, 25.00),
  ('b1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Farbenie vlasov', 'Kompletné farbenie s ošetrením', 120, 15, 65.00),
  ('b1000000-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'Mytie a fúkanie', 'Umytie a fúkanie vlasov', 30, 5, 15.00),
  ('b1000000-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001', 'Manikúra', 'Klasická manikúra', 60, 10, 20.00);

-- Demo employees (no profile_id — standalone until linked)
INSERT INTO public.employees (id, business_id, display_name, email) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Jana Nováková', 'jana@papi-hair.sk'),
  ('c1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Mária Horáková', 'maria@papi-hair.sk');

-- Demo schedules (Mon–Fri for Jana, Mon–Sat for Mária)
INSERT INTO public.schedules (employee_id, day_of_week, start_time, end_time) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'monday', '09:00', '17:00'),
  ('c1000000-0000-0000-0000-000000000001', 'tuesday', '09:00', '17:00'),
  ('c1000000-0000-0000-0000-000000000001', 'wednesday', '09:00', '17:00'),
  ('c1000000-0000-0000-0000-000000000001', 'thursday', '09:00', '17:00'),
  ('c1000000-0000-0000-0000-000000000001', 'friday', '09:00', '17:00'),
  ('c1000000-0000-0000-0000-000000000002', 'monday', '10:00', '18:00'),
  ('c1000000-0000-0000-0000-000000000002', 'tuesday', '10:00', '18:00'),
  ('c1000000-0000-0000-0000-000000000002', 'wednesday', '10:00', '18:00'),
  ('c1000000-0000-0000-0000-000000000002', 'thursday', '10:00', '20:00'),
  ('c1000000-0000-0000-0000-000000000002', 'friday', '10:00', '18:00'),
  ('c1000000-0000-0000-0000-000000000002', 'saturday', '09:00', '14:00');

-- Demo customers (anonymous — no profile_id)
INSERT INTO public.customers (id, business_id, full_name, email, phone) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Katarína Svobodová', 'katarina@example.sk', '+421 911 222 333'),
  ('d1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Petra Blahová', 'petra@example.sk', '+421 944 555 666');

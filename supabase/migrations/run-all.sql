-- === 20260219160842_ac587df3-28ee-419c-b19e-a20eddc1098d.sql ===


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


-- === 20260219160855_7d635dc8-6aed-4db8-bc06-026d4e6ea691.sql ===


-- Fix 1: Set search_path on update_updated_at function (was missing)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Fix 2: Replace permissive "WITH CHECK (true)" on businesses_insert_owner
-- Only authenticated users can insert a business
DROP POLICY IF EXISTS "businesses_insert_owner" ON public.businesses;
CREATE POLICY "businesses_insert_authenticated" ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);


-- === 20260219224051_e1d70956-8ab7-40c3-a5cb-cdcde24497f6.sql ===


-- Add onboarding_completed flag to businesses
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Add unique constraint on onboarding_answers for upsert to work
ALTER TABLE public.onboarding_answers 
ADD CONSTRAINT onboarding_answers_business_step_unique UNIQUE (business_id, step);


-- === 20260220003845_7a285cb4-3c4a-469f-abc5-32a95ea67b0a.sql ===

-- Allow public/anon read access to businesses for the public booking page
CREATE POLICY "businesses_select_public"
ON public.businesses
FOR SELECT
USING (true);

-- === 20260220005009_a027e183-b7b6-4e34-a80c-bd2865f801ce.sql ===


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


-- === 20260220025406_286a15d3-aed0-467d-bf07-59ecdd79d085.sql ===

-- Add URL scheme constraint allowing safe schemes and relative paths
ALTER TABLE public.business_quick_links
  ADD CONSTRAINT url_scheme_check
  CHECK (url ~ '^(https?://|mailto:|tel:|/)');

-- === 20260220050115_51f6eb5c-f56a-4d99-8a2f-6c262b27c0b5.sql ===

-- Idempotency dedup table for offline sync
CREATE TABLE public.sync_dedup (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idempotency_key text NOT NULL UNIQUE,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  action_type text NOT NULL,
  result jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_dedup_key ON public.sync_dedup(idempotency_key);
CREATE INDEX idx_sync_dedup_business ON public.sync_dedup(business_id);

-- Enable RLS
ALTER TABLE public.sync_dedup ENABLE ROW LEVEL SECURITY;

-- Only admins of the business can manage dedup records
CREATE POLICY "sync_dedup_manage_admin"
  ON public.sync_dedup
  FOR ALL
  USING (is_business_admin(auth.uid(), business_id));


-- === 20260220105404_3bf49543-2aff-44be-850e-8f3eac89a658.sql ===


-- Table for storing WebAuthn/Passkey credentials
CREATE TABLE public.passkeys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  sign_count bigint NOT NULL DEFAULT 0,
  device_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own passkeys
CREATE POLICY "passkeys_select_own" ON public.passkeys FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "passkeys_insert_own" ON public.passkeys FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "passkeys_delete_own" ON public.passkeys FOR DELETE USING (auth.uid() = profile_id);
CREATE POLICY "passkeys_update_own" ON public.passkeys FOR UPDATE USING (auth.uid() = profile_id);

-- Index for credential lookups during authentication
CREATE INDEX idx_passkeys_credential_id ON public.passkeys(credential_id);
CREATE INDEX idx_passkeys_profile_id ON public.passkeys(profile_id);


-- === 20260220135634_16f3912b-3a74-4c4d-99fe-881ceb1d782e.sql ===


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


-- === 20260220160350_2db5ad0e-6d05-42f3-8a7b-5eca1d0856a2.sql ===


-- Public SELECT policy for appointments (e.g. booking availability)
CREATE POLICY "appointments_select_public"
  ON public.appointments FOR SELECT
  USING (true);


-- === 20260221010322_2c0e2b4e-2988-4225-9d81-7eb1debde20a.sql ===


-- Add category and subcategory to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS category text DEFAULT 'damske';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS subcategory text;

-- Add photo_url to employees
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS photo_url text;

-- Update existing services with categories and subcategories
UPDATE public.services SET category = 'damske', subcategory = 'STRIH' WHERE name_sk IN ('Dámsky strih');
UPDATE public.services SET category = 'damske', subcategory = 'STYLING' WHERE name_sk IN ('Finálny styling', 'Fúkaná dlhé vlasy', 'Fúkaná polodlhé vlasy');
UPDATE public.services SET category = 'damske', subcategory = 'FARBENIE' WHERE name_sk IN ('Farbenie odrastov', 'Farbenie odrastov so strihom', 'Kompletné farbenie', 'Kompletné farbenie so strihom', 'Farbenie vlasov');
UPDATE public.services SET category = 'damske', subcategory = 'BALAYAGE' WHERE name_sk IN ('Balayage komplet', 'Balayage dorábka', 'Melír komplet', 'Melír dorábka');
UPDATE public.services SET category = 'damske', subcategory = 'REGENERÁCIA' WHERE name_sk IN ('Brazílsky keratín', 'Methamorphyc - exkluzívna kúra', 'Methamorphyc - rýchla kúra', 'Gumovanie alebo čistenie farby');
UPDATE public.services SET category = 'damske', subcategory = 'PREDLŽOVANIE' WHERE name_sk IN ('Aplikácia Tape-in', 'Prepojenie Tape-in', 'Spoločenský účes', 'Svadobný účes');
UPDATE public.services SET category = 'panske', subcategory = 'VLASY' WHERE name_sk IN ('Pánsky strih');
UPDATE public.services SET category = 'panske', subcategory = 'BRADA' WHERE name_sk IN ('Strih brady');
UPDATE public.services SET category = 'panske', subcategory = 'VLASY A BRADA' WHERE name_sk IN ('Kombinácia vlasy a brada', 'Pánsky špeciál');
UPDATE public.services SET category = 'panske', subcategory = 'FARBA' WHERE name_sk IN ('Farbenie brady');
UPDATE public.services SET category = 'panske', subcategory = 'DOPLNKOVÉ SLUŽBY' WHERE name_sk IN ('Čierna zlupovacia maska', 'Depilácia nosa aj uší');

-- Update employees: rename to Miška and Maťo
UPDATE public.employees SET display_name = 'Miška' WHERE id = 'c1000000-0000-0000-0000-000000000001';
UPDATE public.employees SET display_name = 'Maťo' WHERE id = 'c1000000-0000-0000-0000-000000000002';


-- === 20260221031715_d2d16bb1-eefe-41f9-9fc7-2d80211c9f0d.sql ===

ALTER TABLE public.businesses
ADD COLUMN smtp_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- === 20260222180000_employee_services.sql ===


-- Create employee_services join table
CREATE TABLE IF NOT EXISTS public.employee_services (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(employee_id, service_id)
);

-- Enable RLS
ALTER TABLE public.employee_services ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read for employee_services" 
ON public.employee_services FOR SELECT 
USING (true);

CREATE POLICY "Admin full access for employee_services" 
ON public.employee_services FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.employees e 
    WHERE e.id = employee_services.employee_id 
    AND public.is_business_admin(auth.uid(), e.business_id)
  )
);

-- Pre-assign all current services to all current employees for the demo business
-- This ensures no disruption until the admin manually changes it
INSERT INTO public.employee_services (employee_id, service_id)
SELECT e.id, s.id
FROM public.employees e
CROSS JOIN public.services s
WHERE e.business_id = s.business_id
ON CONFLICT DO NOTHING;


-- === 20260224120000_allow_admin_providers_toggle.sql ===
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS allow_admin_providers boolean NOT NULL DEFAULT true;

-- === 20260224131500_enforce_admin_provider_toggle_on_appointments.sql ===
-- Enforce allow_admin_providers toggle at DB level for all appointment writes
CREATE OR REPLACE FUNCTION public.enforce_admin_provider_toggle_on_appointments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allow_admin_providers boolean;
  employee_profile_id uuid;
  is_admin_provider boolean;
BEGIN
  IF NEW.employee_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT b.allow_admin_providers
  INTO allow_admin_providers
  FROM public.businesses b
  WHERE b.id = NEW.business_id;

  IF COALESCE(allow_admin_providers, true) THEN
    RETURN NEW;
  END IF;

  SELECT e.profile_id
  INTO employee_profile_id
  FROM public.employees e
  WHERE e.id = NEW.employee_id
    AND e.business_id = NEW.business_id;

  IF employee_profile_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.business_id = NEW.business_id
      AND m.profile_id = employee_profile_id
      AND m.role IN ('owner', 'admin')
  ) INTO is_admin_provider;

  IF is_admin_provider THEN
    RAISE EXCEPTION 'Admin provider assignment is disabled for this business';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_admin_provider_toggle_on_appointments ON public.appointments;

CREATE TRIGGER trg_enforce_admin_provider_toggle_on_appointments
BEFORE INSERT OR UPDATE OF employee_id, business_id ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_admin_provider_toggle_on_appointments();

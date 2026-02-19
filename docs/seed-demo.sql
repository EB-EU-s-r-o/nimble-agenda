-- ============================================================
-- SEED: Demo business "Papi Hair Studio"
-- Deterministic — running on a fresh DB always produces the same result.
-- ============================================================

-- 1. Business
INSERT INTO public.businesses (id, name, slug, onboarding_completed, timezone, opening_hours, lead_time_minutes, max_days_ahead, cancellation_hours)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  'Papi Hair Studio',
  'papi-hair',
  true,  -- onboarding already completed
  'Europe/Bratislava',
  '{
    "monday":    {"open": true, "start": "09:00", "end": "18:00"},
    "tuesday":   {"open": true, "start": "09:00", "end": "18:00"},
    "wednesday": {"open": true, "start": "09:00", "end": "18:00"},
    "thursday":  {"open": true, "start": "09:00", "end": "18:00"},
    "friday":    {"open": true, "start": "09:00", "end": "18:00"},
    "saturday":  {"open": true, "start": "09:00", "end": "14:00"},
    "sunday":    {"open": false, "start": "09:00", "end": "18:00"}
  }'::jsonb,
  60,  -- lead_time_minutes
  60,  -- max_days_ahead
  24   -- cancellation_hours
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  onboarding_completed = EXCLUDED.onboarding_completed,
  opening_hours = EXCLUDED.opening_hours;

-- 2. Services
INSERT INTO public.services (id, business_id, name_sk, duration_minutes, buffer_minutes, price, is_active) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Strihanie vlasov', 45, 10, 25.00, true),
  ('b1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Farbenie vlasov',  120, 15, 65.00, true),
  ('b1000000-0000-0000-0000-000000000003', 'a1b2c3d4-0000-0000-0000-000000000001', 'Mytie a fúkanie',  30,  5,  15.00, true),
  ('b1000000-0000-0000-0000-000000000004', 'a1b2c3d4-0000-0000-0000-000000000001', 'Manikúra',         60,  10, 20.00, true)
ON CONFLICT (id) DO UPDATE SET
  name_sk = EXCLUDED.name_sk,
  duration_minutes = EXCLUDED.duration_minutes,
  buffer_minutes = EXCLUDED.buffer_minutes,
  price = EXCLUDED.price,
  is_active = EXCLUDED.is_active;

-- 3. Employees
INSERT INTO public.employees (id, business_id, display_name, email, is_active) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'a1b2c3d4-0000-0000-0000-000000000001', 'Jana Nováková',   'jana@papi-hair.sk',  true),
  ('c1000000-0000-0000-0000-000000000002', 'a1b2c3d4-0000-0000-0000-000000000001', 'Mária Horáková',  'maria@papi-hair.sk', true)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  email = EXCLUDED.email,
  is_active = EXCLUDED.is_active;

-- 4. Schedules
DELETE FROM public.schedules WHERE employee_id IN (
  'c1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002'
);

INSERT INTO public.schedules (employee_id, day_of_week, start_time, end_time) VALUES
  -- Jana: Mon-Fri 09:00-17:00
  ('c1000000-0000-0000-0000-000000000001', 'monday',    '09:00', '17:00'),
  ('c1000000-0000-0000-0000-000000000001', 'tuesday',   '09:00', '17:00'),
  ('c1000000-0000-0000-0000-000000000001', 'wednesday', '09:00', '17:00'),
  ('c1000000-0000-0000-0000-000000000001', 'thursday',  '09:00', '17:00'),
  ('c1000000-0000-0000-0000-000000000001', 'friday',    '09:00', '17:00'),
  -- Mária: Mon-Sat, longer Thu
  ('c1000000-0000-0000-0000-000000000002', 'monday',    '10:00', '18:00'),
  ('c1000000-0000-0000-0000-000000000002', 'tuesday',   '10:00', '18:00'),
  ('c1000000-0000-0000-0000-000000000002', 'wednesday', '10:00', '18:00'),
  ('c1000000-0000-0000-0000-000000000002', 'thursday',  '10:00', '20:00'),
  ('c1000000-0000-0000-0000-000000000002', 'friday',    '10:00', '18:00'),
  ('c1000000-0000-0000-0000-000000000002', 'saturday',  '09:00', '14:00');

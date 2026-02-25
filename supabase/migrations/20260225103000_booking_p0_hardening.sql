-- P0 booking hardening: remove public appointment reads and enforce no-overlap booking integrity

-- 1) Remove permissive public read policy (PII exposure risk)
DROP POLICY IF EXISTS "appointments_select_public" ON public.appointments;

-- 2) Enforce no-overlap reservations per employee at DB level
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'no_overlapping_employee_slots'
  ) THEN
    ALTER TABLE public.appointments
    ADD CONSTRAINT no_overlapping_employee_slots
    EXCLUDE USING gist (
      employee_id WITH =,
      tstzrange(start_at, end_at, '[)') WITH &&
    )
    WHERE (status <> 'cancelled');
  END IF;
END $$;

-- 3) Calendar query accelerator
CREATE INDEX IF NOT EXISTS idx_appointments_business_employee_start
  ON public.appointments(business_id, employee_id, start_at)
  WHERE status <> 'cancelled';

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
  -- No employee set (shouldn't happen with current schema), nothing to validate
  IF NEW.employee_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT b.allow_admin_providers
  INTO allow_admin_providers
  FROM public.businesses b
  WHERE b.id = NEW.business_id;

  -- Backward-compatible fallback
  IF COALESCE(allow_admin_providers, true) THEN
    RETURN NEW;
  END IF;

  SELECT e.profile_id
  INTO employee_profile_id
  FROM public.employees e
  WHERE e.id = NEW.employee_id
    AND e.business_id = NEW.business_id;

  -- If employee has no linked profile, treat as non-admin provider
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

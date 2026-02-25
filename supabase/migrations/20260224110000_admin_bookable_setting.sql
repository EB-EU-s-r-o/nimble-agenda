-- Admin bookability is controlled by a business setting.
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS allow_admin_in_service_selection boolean NOT NULL DEFAULT false;

-- Owner helper (explicitly stricter than is_business_admin)
CREATE OR REPLACE FUNCTION public.is_business_owner(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE profile_id = _user_id
      AND business_id = _business_id
      AND role = 'owner'
  );
$$;

-- Owner-only update endpoint for booking setting
CREATE OR REPLACE FUNCTION public.set_allow_admin_in_service_selection(
  p_business_id uuid,
  p_value boolean
)
RETURNS public.businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated_row public.businesses;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  IF NOT public.is_business_owner(auth.uid(), p_business_id) THEN
    RAISE EXCEPTION 'Only owner can change this setting' USING ERRCODE = '42501';
  END IF;

  UPDATE public.businesses
  SET allow_admin_in_service_selection = p_value
  WHERE id = p_business_id
  RETURNING * INTO updated_row;

  RETURN updated_row;
END;
$$;

-- Read endpoint used by booking/settings screens.
CREATE OR REPLACE FUNCTION public.get_bookable_service_providers(
  p_business_id uuid,
  p_service_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  display_name text,
  email text,
  phone text,
  photo_url text,
  is_active boolean,
  has_schedule boolean,
  role public.app_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.display_name,
    e.email,
    e.phone,
    e.photo_url,
    e.is_active,
    EXISTS (
      SELECT 1 FROM public.schedules s WHERE s.employee_id = e.id
    ) AS has_schedule,
    COALESCE(m.role, 'employee'::public.app_role) AS role
  FROM public.employees e
  JOIN public.businesses b ON b.id = e.business_id
  LEFT JOIN public.memberships m
    ON m.profile_id = e.profile_id
   AND m.business_id = e.business_id
  WHERE e.business_id = p_business_id
    AND e.is_active = true
    AND (
      p_service_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.employee_services es
        WHERE es.employee_id = e.id
          AND es.service_id = p_service_id
      )
      OR NOT EXISTS (
        SELECT 1
        FROM public.employee_services es_any
        WHERE es_any.employee_id = e.id
      )
    )
    AND (
      COALESCE(m.role, 'employee'::public.app_role) <> 'admin'::public.app_role
      OR b.allow_admin_in_service_selection = true
    )
  ORDER BY e.display_name;
$$;

-- Backend enforcement for all appointment writes (public flow + admin UI + manual payload).
CREATE OR REPLACE FUNCTION public.enforce_admin_service_booking_setting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  employee_role public.app_role;
  allow_admin boolean;
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.employee_id IS NOT DISTINCT FROM NEW.employee_id
     AND OLD.business_id IS NOT DISTINCT FROM NEW.business_id THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(m.role, 'employee'::public.app_role)
  INTO employee_role
  FROM public.employees e
  LEFT JOIN public.memberships m
    ON m.profile_id = e.profile_id
   AND m.business_id = e.business_id
  WHERE e.id = NEW.employee_id
    AND e.business_id = NEW.business_id;

  IF employee_role IS NULL THEN
    RAISE EXCEPTION 'Invalid employee for this business' USING ERRCODE = '23503';
  END IF;

  IF employee_role = 'admin'::public.app_role THEN
    SELECT b.allow_admin_in_service_selection
    INTO allow_admin
    FROM public.businesses b
    WHERE b.id = NEW.business_id;

    IF COALESCE(allow_admin, false) = false THEN
      RAISE EXCEPTION 'Admin cannot be booked for services while setting is disabled' USING ERRCODE = '22023';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointments_enforce_admin_service_booking_setting ON public.appointments;
CREATE TRIGGER trg_appointments_enforce_admin_service_booking_setting
  BEFORE INSERT OR UPDATE OF business_id, employee_id
  ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_service_booking_setting();

-- Defense-in-depth: non-owner cannot flip this value via direct table updates.
CREATE OR REPLACE FUNCTION public.enforce_owner_for_admin_service_setting_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.allow_admin_in_service_selection IS DISTINCT FROM OLD.allow_admin_in_service_selection THEN
    IF auth.uid() IS NULL OR NOT public.is_business_owner(auth.uid(), NEW.id) THEN
      RAISE EXCEPTION 'Only owner can change allow_admin_in_service_selection' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_businesses_owner_only_admin_service_setting ON public.businesses;
CREATE TRIGGER trg_businesses_owner_only_admin_service_setting
  BEFORE UPDATE OF allow_admin_in_service_selection
  ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_owner_for_admin_service_setting_change();

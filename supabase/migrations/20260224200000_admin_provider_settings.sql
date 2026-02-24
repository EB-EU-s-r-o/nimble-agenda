-- ============================================================
-- Admin Provider Settings Migration
-- Allows controlling whether admins/owners can be booked for services
-- ============================================================

-- 1. Add allow_admin_as_provider setting to businesses
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS allow_admin_as_provider BOOLEAN NOT NULL DEFAULT false;

-- 2. Create function to check if employee is bookable for services
CREATE OR REPLACE FUNCTION public.is_employee_bookable_for_services(
  _employee_id UUID,
  _business_id UUID
) RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    CASE 
      -- Legacy employee without profile link - always bookable
      WHEN e.profile_id IS NULL THEN true
      -- Regular employee - always bookable
      WHEN m.role = 'employee' THEN true
      -- Customer role - not bookable for services
      WHEN m.role = 'customer' THEN false
      -- Admin/Owner - bookable only if setting is enabled
      WHEN m.role IN ('admin', 'owner') THEN 
        COALESCE(
          (SELECT allow_admin_as_provider FROM public.businesses WHERE id = _business_id),
          false
        )
      -- Unknown role - not bookable
      ELSE false
    END
  FROM public.employees e
  LEFT JOIN public.memberships m ON m.profile_id = e.profile_id AND m.business_id = e.business_id
  WHERE e.id = _employee_id AND e.business_id = _business_id AND e.is_active = true;
$$;

-- 3. Create function to get bookable employees for a business
CREATE OR REPLACE FUNCTION public.get_bookable_employees(_business_id UUID)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  photo_url TEXT,
  is_active BOOLEAN,
  profile_id UUID,
  role app_role
) LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT 
    e.id,
    e.display_name,
    e.email,
    e.phone,
    e.photo_url,
    e.is_active,
    e.profile_id,
    m.role
  FROM public.employees e
  LEFT JOIN public.memberships m ON m.profile_id = e.profile_id AND m.business_id = e.business_id
  WHERE e.business_id = _business_id 
    AND e.is_active = true
    AND (
      -- Legacy employee without profile
      e.profile_id IS NULL
      -- Regular employee
      OR m.role = 'employee'
      -- Admin/Owner only if setting is enabled
      OR (
        m.role IN ('admin', 'owner')
        AND COALESCE(
          (SELECT allow_admin_as_provider FROM public.businesses WHERE id = _business_id),
          false
        ) = true
      )
    );
$$;

-- 4. Add comment to the new column
COMMENT ON COLUMN public.businesses.allow_admin_as_provider IS 
'When true, admins and owners with employee records can be selected as service providers. When false (default), they are excluded from service booking selection but can still have calendar columns for notes/blocks.';

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_employee_bookable_for_services(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_bookable_employees(UUID) TO authenticated;
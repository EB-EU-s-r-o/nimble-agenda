
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

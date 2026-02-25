ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS allow_admin_providers boolean NOT NULL DEFAULT true;

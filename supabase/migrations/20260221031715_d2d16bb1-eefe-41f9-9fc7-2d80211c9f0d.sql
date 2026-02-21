ALTER TABLE public.businesses
ADD COLUMN smtp_config jsonb NOT NULL DEFAULT '{}'::jsonb;
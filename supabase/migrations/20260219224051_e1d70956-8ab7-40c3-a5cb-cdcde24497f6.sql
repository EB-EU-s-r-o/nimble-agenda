
-- Add onboarding_completed flag to businesses
ALTER TABLE public.businesses 
ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Add unique constraint on onboarding_answers for upsert to work
ALTER TABLE public.onboarding_answers 
ADD CONSTRAINT onboarding_answers_business_step_unique UNIQUE (business_id, step);

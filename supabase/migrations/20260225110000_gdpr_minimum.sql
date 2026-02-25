-- GDPR minimum runtime tables: consent audit trail + DSAR request intake

CREATE TABLE IF NOT EXISTS public.consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('anon_user', 'authenticated_user', 'session')),
  subject_id TEXT,
  action TEXT NOT NULL CHECK (action IN ('accept', 'reject', 'update', 'withdraw')),
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL CHECK (source IN ('web', 'app')),
  user_agent TEXT,
  ip_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_consent_events_created_at ON public.consent_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_events_business_id ON public.consent_events(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_events_subject ON public.consent_events(subject_type, subject_id, created_at DESC);

ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'delete')),
  status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'pending_review', 'completed', 'rejected')),
  source TEXT NOT NULL CHECK (source IN ('web', 'app')),
  auth_user_id UUID,
  requester_email_hash TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_gdpr_requests_created_at ON public.gdpr_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_auth_user ON public.gdpr_requests(auth_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_type_status ON public.gdpr_requests(request_type, status, created_at DESC);

ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_gdpr_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_gdpr_requests_updated_at ON public.gdpr_requests;
CREATE TRIGGER trg_set_gdpr_requests_updated_at
BEFORE UPDATE ON public.gdpr_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_gdpr_requests_updated_at();

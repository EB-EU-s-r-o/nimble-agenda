-- Idempotency dedup table for offline sync
CREATE TABLE public.sync_dedup (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  idempotency_key text NOT NULL UNIQUE,
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  action_type text NOT NULL,
  result jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_dedup_key ON public.sync_dedup(idempotency_key);
CREATE INDEX idx_sync_dedup_business ON public.sync_dedup(business_id);

-- Enable RLS
ALTER TABLE public.sync_dedup ENABLE ROW LEVEL SECURITY;

-- Only admins of the business can manage dedup records
CREATE POLICY "sync_dedup_manage_admin"
  ON public.sync_dedup
  FOR ALL
  USING (is_business_admin(auth.uid(), business_id));

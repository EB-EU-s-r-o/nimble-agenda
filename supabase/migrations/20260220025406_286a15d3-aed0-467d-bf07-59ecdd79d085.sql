-- Add URL scheme constraint allowing safe schemes and relative paths
ALTER TABLE public.business_quick_links
  ADD CONSTRAINT url_scheme_check
  CHECK (url ~ '^(https?://|mailto:|tel:|/)');
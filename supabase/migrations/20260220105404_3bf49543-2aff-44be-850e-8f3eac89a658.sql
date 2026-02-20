
-- Table for storing WebAuthn/Passkey credentials
CREATE TABLE public.passkeys (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  sign_count bigint NOT NULL DEFAULT 0,
  device_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own passkeys
CREATE POLICY "passkeys_select_own" ON public.passkeys FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "passkeys_insert_own" ON public.passkeys FOR INSERT WITH CHECK (auth.uid() = profile_id);
CREATE POLICY "passkeys_delete_own" ON public.passkeys FOR DELETE USING (auth.uid() = profile_id);
CREATE POLICY "passkeys_update_own" ON public.passkeys FOR UPDATE USING (auth.uid() = profile_id);

-- Index for credential lookups during authentication
CREATE INDEX idx_passkeys_credential_id ON public.passkeys(credential_id);
CREATE INDEX idx_passkeys_profile_id ON public.passkeys(profile_id);

-- ============================================================
-- Firebase Auth (Third-Party): mapovanie Firebase UID na profile
-- a helper pre RLS, aby fungoval Supabase aj Firebase JWT.
-- ============================================================

-- Povoľujeme profily bez záznamu v auth.users (pre Firebase používateľov).
-- Supabase používatelia stále dostanú profil cez trigger on auth.users.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND constraint_name = 'profiles_id_fkey'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
  END IF;
END $$;

-- Mapovacia tabuľka: Firebase UID (z JWT sub) -> profile UUID
CREATE TABLE IF NOT EXISTS public.firebase_profile_map (
  firebase_uid TEXT PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.firebase_profile_map ENABLE ROW LEVEL SECURITY;

-- Firebase JWT: môže čítať len svoj záznam (firebase_uid = sub). Supabase JWT: nie je v mape.
CREATE POLICY "firebase_map_select_own" ON public.firebase_profile_map FOR SELECT
  USING (auth.jwt()->>'sub' = firebase_uid);
CREATE POLICY "firebase_map_insert_own" ON public.firebase_profile_map FOR INSERT
  WITH CHECK (true);
CREATE POLICY "firebase_map_delete_own" ON public.firebase_profile_map FOR DELETE
  USING (auth.jwt()->>'sub' = firebase_uid);

-- Funkcia vracia aktuálny profile_id (UUID) pre Supabase alebo Firebase JWT.
-- Pri Firebase JWT používa firebase_profile_map; inak auth.uid().
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  iss TEXT;
  sub TEXT;
BEGIN
  iss := auth.jwt()->>'iss';
  sub := auth.jwt()->>'sub';
  IF iss IS NULL OR sub IS NULL THEN
    RETURN NULL;
  END IF;
  -- Firebase JWT: iss = https://securetoken.google.com/<project_id>
  IF iss LIKE 'https://securetoken.google.com/%' THEN
    RETURN (SELECT profile_id FROM public.firebase_profile_map WHERE firebase_uid = sub LIMIT 1);
  END IF;
  -- Supabase JWT: auth.uid() je UUID
  RETURN auth.uid();
END;
$$;

-- RPC: vráti profil prihláseného používateľa (Supabase alebo Firebase)
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles WHERE id = public.current_profile_id() LIMIT 1;
$$;

-- RPC: vráti memberships prihláseného používateľa
CREATE OR REPLACE FUNCTION public.get_my_memberships()
RETURNS SETOF public.memberships
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.memberships WHERE profile_id = public.current_profile_id();
$$;

-- RPC: pri prvom prihlásení cez Firebase vytvorí profil a záznam v firebase_profile_map.
-- Volaj po Firebase sign-in (email, full_name z Firebase user).
CREATE OR REPLACE FUNCTION public.ensure_my_firebase_profile(p_email TEXT DEFAULT NULL, p_full_name TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fid TEXT;
  pid UUID;
BEGIN
  fid := auth.jwt()->>'sub';
  IF fid IS NULL OR auth.jwt()->>'iss' NOT LIKE 'https://securetoken.google.com/%' THEN
    RETURN NULL;
  END IF;
  SELECT profile_id INTO pid FROM public.firebase_profile_map WHERE firebase_uid = fid LIMIT 1;
  IF pid IS NOT NULL THEN
    RETURN pid;
  END IF;
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (gen_random_uuid(), COALESCE(p_full_name, ''), COALESCE(p_email, ''))
  RETURNING id INTO pid;
  INSERT INTO public.firebase_profile_map (firebase_uid, profile_id) VALUES (fid, pid);
  RETURN pid;
END;
$$;

-- Poznámka: Aby RLS fungoval s Firebase JWT, treba v každej politike nahradiť auth.uid() za current_profile_id().
-- To je urobené v samostatnom migračnom súbore alebo cez docs (manuálne spustenie).
-- Táto migrácia pridáva iba tabuľku, funkciu a RPC.

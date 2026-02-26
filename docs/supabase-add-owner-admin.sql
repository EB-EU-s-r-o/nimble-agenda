-- ============================================================
-- Pridanie admin/owner práv pre owner@papihairdesign.sk v Supabase
-- Spusti v Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- User z auth.users: id = 1c479a8e-a00f-4a55-9473-5c61abd7b120, email = owner@papihairdesign.sk

-- 1. Zabezpeč, že existuje profil (id = auth user id)
INSERT INTO public.profiles (id, full_name, email, updated_at)
VALUES (
  '1c479a8e-a00f-4a55-9473-5c61abd7b120',
  'Owner Papi',
  'owner@papihairdesign.sk',
  now()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = now();

-- 2. Pridaj membership s rolou owner pre demo business (Papi Hair Studio)
INSERT INTO public.memberships (business_id, profile_id, role)
VALUES (
  'a1b2c3d4-0000-0000-0000-000000000001',
  '1c479a8e-a00f-4a55-9473-5c61abd7b120',
  'owner'
)
ON CONFLICT (business_id, profile_id) DO UPDATE SET role = 'owner';

-- 3. (Voliteľne) Globálna rola v user_roles – ak ju aplikácia používa
INSERT INTO public.user_roles (user_id, role)
VALUES ('1c479a8e-a00f-4a55-9473-5c61abd7b120', 'owner')
ON CONFLICT (user_id, role) DO NOTHING;

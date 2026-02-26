-- Predvolená SMTP pre demo business (Papi Hair Design): Websupport, booking@papihairdesign.sk.
-- Heslo sa nikdy neukladá v migráciách – používateľ ho zadá v Admin → Nastavenia → SMTP.
UPDATE public.businesses
SET smtp_config = '{"host":"smtp.m1.websupport.sk","port":465,"user":"booking@papihairdesign.sk","from":"booking@papihairdesign.sk"}'::jsonb
WHERE id = 'a1b2c3d4-0000-0000-0000-000000000001'
  AND (smtp_config IS NULL OR smtp_config = '{}'::jsonb);

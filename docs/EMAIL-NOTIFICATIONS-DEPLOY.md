 ?
 # Email Notifikácie - Deployment Guide

## Rýchly deployment (3 kroky)

### Krok 1: Aplikovanie migrácie
```bash
cd /Users/youh4ck3dme/Developer/01_ACTIVE/BOOKING-PAPIHAIRDESIGN-SK/nimble-agenda
supabase db push
```

### Krok 2: Deployment edge functions
```bash
# Nová funkcia pre notifikácie
supabase functions deploy send-appointment-notification

# Aktualizované funkcie
supabase functions deploy create-public-booking
supabase functions deploy sync-push
```

### Krok 3: Overenie environment variables
```bash
supabase secrets list
```

Potrebné secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

---

## Testovanie po deploymente

### Test 1: Verejná rezervácia
1. Otvor verejnú booking stránku
2. Vytvor rezerváciu
3. Skontroluj logy:
```sql
SELECT * FROM notification_logs 
ORDER BY created_at DESC 
LIMIT 10;
```

### Test 2: Admin/Reception rezervácia
1. Prihlás sa ako admin
2. Vytvor rezerváciu v Reception
3. Skontroluj či prišiel email

### Test 3: Update rezervácie
1. Uprav existujúcu rezerváciu
2. Over či prišiel email o zmene

### Test 4: Zrušenie rezervácie
1. Zruš rezerváciu
2. Over či prišiel email o zrušení

---

## Troubleshooting

### Problém: Emails nechodia
```bash
# Skontroluj logy edge function
supabase functions logs send-appointment-notification --tail
```

### Problém: SMTP error
- Over či je v `businesses.smtp_config` správna konfigurácia
- Skontroluj či SMTP server nie je blokovaný

### Problém: Duplicitné emaily
```sql
-- Vyhľadaj duplicity
SELECT appointment_id, event_type, recipient_email, COUNT(*)
FROM notification_logs
GROUP BY appointment_id, event_type, recipient_email
HAVING COUNT(*) > 1;
```

---

## Rollback (ak by bolo potrebné)

### Odstránenie migrácie
```sql
DROP TABLE IF EXISTS notification_logs;
DROP FUNCTION IF EXISTS was_notification_sent(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS get_business_admin_emails(UUID);
DROP FUNCTION IF EXISTS get_appointment_employee_email(UUID);
```

### Revert funkcie
```bash
# Obnov predchádzajúcu verziu z git
git checkout HEAD~1 -- supabase/functions/create-public-booking/index.ts
git checkout HEAD~1 -- supabase/functions/sync-push/index.ts

# Re-deploy
supabase functions deploy create-public-booking
supabase functions deploy sync-push

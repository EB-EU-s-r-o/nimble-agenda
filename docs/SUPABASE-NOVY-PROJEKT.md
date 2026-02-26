# Nastavenie nového Supabase projektu (hrkwqdvfeudxkqttpgls)

Konfigurácia (`.env`, skripty, `config.toml`) už ukazuje na nový projekt. **Tabuľky a schéma sa zo starého projektu nekopírovali automaticky** – treba ich v novom projekte vytvoriť.

## Čo aplikácia + Firebase Hosting potrebujú

- **Tabuľky:** profiles, businesses, memberships, employees, services, appointments, customers, business_hours, business_date_overrides, business_quick_links, schedules, onboarding_answers, employee_services, booking_claims, sync_dedup, user_roles, notifikácie (podľa migrácií)
- **RLS politiky** a helper funkcie (is_business_admin, get_employee_id, …)
- **Edge Functions:** create-public-booking, claim-booking, sync-push, sync-pull, send-booking-email, send-appointment-notification, webauthn-register, webauthn-authenticate, save-smtp-config, seed-demo-accounts
- **Auth:** Site URL a Redirect URLs (napr. pre Firebase Hosting doménu) – cez `.\supabase-push-auth-config.ps1` alebo Dashboard

---

## 1. Migrácie (tabuľky + RLS)

**Cesta A – Supabase CLI (odporúčané)**

```powershell
cd c:\Users\42195\nimble-agenda
npx supabase login
.\supabase-db-push.ps1
```

Projekt je v skripte nastavený na `hrkwqdvfeudxkqttpgls`. Ak link zlyhá, over že si v Supabase tíme tohto projektu.

**Cesta B – SQL Editor (ak nemáš CLI prístup)**

1. Supabase Dashboard → projekt **hrkwqdvfeudxkqttpgls** → SQL Editor.
2. Spusti migrácie v poradí podľa dátumu v názve (napr. od `20260219160842_...` po `20260226120000_...`).  
   Alebo skopíruj obsah súboru **`supabase/migrations/run-all.sql`** (ak existuje a obsahuje všetko potrebné) a spusti ho v SQL Editore.

**Cesta C – psql (direct connection)**

```powershell
$env:PGPASSWORD = "tvoje_db_heslo"
.\supabase-db-push-psql.ps1
```

Heslo: Supabase Dashboard → Settings → Database → Connection string.

---

## 2. Edge Functions

Po migráciách nasaď funkcie (vyžaduje Supabase CLI a prihlásenie):

```powershell
npx supabase functions deploy
```

Prípadne jednotlivo: `create-public-booking`, `claim-booking`, `sync-push`, `sync-pull`, `send-booking-email`, `send-appointment-notification`, `webauthn-register`, `webauthn-authenticate`, `save-smtp-config`, `seed-demo-accounts`.

Secrets (SMTP a pod.) nastav v Dashboarde alebo cez `npx supabase secrets set ...`.

---

## 3. Auth (pre Firebase Hosting doménu)

Ak bude app na Firebase Hosting (napr. `https://phd-booking.web.app` alebo vlastná doména):

1. V `supabase/config.toml` skontroluj `[auth]` – `site_url` a `additional_redirect_urls` (tvoja hosting URL).
2. Spusti: `.\supabase-push-auth-config.ps1`

---

## 4. Jednorazové SQL (voliteľné)

- **Owner/admin:** `docs/supabase-add-owner-admin.sql` – uprav email / user id podľa svojho účtu, potom spusti v SQL Editore.
- **Demo dáta:** `docs/seed-demo.sql` – demo prevádzka a služby.

---

## 5. Overenie

- Lokálne: `pnpm run dev` → otvor `/booking`, `/admin`, `/diagnostics`.
- Na Firebase Hosting: po deployi skontroluj tie isté cesty; v Diagnostics over že `VITE_SUPABASE_URL` ukazuje na `hrkwqdvfeudxkqttpgls.supabase.co`.

Po dokončení krokov 1–3 by mali Supabase + Firebase Hosting fungovať so novým projektom.

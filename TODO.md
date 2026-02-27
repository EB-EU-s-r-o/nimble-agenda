# TODO – čo ešte treba nastaviť v projekte

Kompletný zoznam nastavení ohladom projektu. Zaškrtni po dokončení.

---

## 1. Premenné prostredia (lokálne `.env`)

V koreni projektu vytvor alebo doplň `.env` (skopíruj z `.env.example`). Vyplň:

- [ ] **VITE_SUPABASE_URL** = `https://hrkwqdvfeudxkqttpgls.supabase.co` (už v .env.example)
- [ ] **VITE_SUPABASE_PUBLISHABLE_KEY** = Publishable API Key z Supabase Dashboard → Settings → API (Project API)
- [ ] **VITE_SUPABASE_PROJECT_ID** = `hrkwqdvfeudxkqttpgls`

Ak používaš **Firebase Auth** (prihlásenie cez Firebase):

- [ ] **VITE_FIREBASE_API_KEY**, **VITE_FIREBASE_AUTH_DOMAIN**, **VITE_FIREBASE_PROJECT_ID**, **VITE_FIREBASE_APP_ID**, **VITE_FIREBASE_STORAGE_BUCKET**, **VITE_FIREBASE_MESSAGING_SENDER_ID**, **VITE_FIREBASE_MEASUREMENT_ID** – z Firebase Console → Project Settings → General → Your apps → Web app

Backend pre rezervácie (vyber jednu možnosť):

- [ ] **Cesta A – Supabase (bez Blaze):** nechaj **VITE_FIREBASE_FUNCTIONS_URL** prázdnu alebo vymaž; rezervácie pôjdu cez Supabase Edge Function
- [ ] **Cesta B – Firebase Functions (vyžaduje Blaze):** **VITE_FIREBASE_FUNCTIONS_URL** = `https://europe-west1-phd-booking.cloudfunctions.net` (alebo skutočná URL po deployi functions)

Voliteľné:

- [ ] **VITE_APP_CHECK_DEBUG_TOKEN** = `FFAD7D74-5F9F-4214-8E74-8F19C3BD643E` (ak používaš App Check na localhost/CI)
- [ ] **VITE_RECAPTCHA_SITE_KEY** = site key z reCAPTCHA (v3) – pre neviditeľnú ochranu rezervácií
- [ ] **VERCEL_TOKEN** – len ak automatizuješ deploy cez skripty (docs/VERCEL-DIAGNOSTICS.md)

---

## 2. Supabase Dashboard

URL: **https://supabase.com/dashboard** → projekt **hrkwqdvfeudxkqttpgls**

- [ ] **Settings → API:** skontrolovať Project URL a anon key (použité v `.env`)
- [ ] **Authentication → URL Configuration:** ak používaš Supabase Auth na produkcii, nastaviť **Site URL** a **Redirect URLs** na `https://booking.papihairdesign.sk` (pozri docs/AUTH-BOOKING-DOMAIN.md)
- [ ] **SQL Editor:** spustiť **docs/supabase-add-owner-admin.sql** – pridá owner práva pre owner@papihairdesign.sk (profil + membership owner pre demo business)
- [ ] **Database:** nahrať migrácie (supabase db push alebo spustiť migrácie cez SQL Editor) – tabuľky profiles, businesses, memberships, appointments, customers, employees, services, schedules, booking_claims, atď.
- [ ] **Edge Functions:** nasadiť funkcie – `supabase functions deploy` alebo jednotlivo (create-public-booking, claim-booking, sync-push, sync-pull, webauthn-register, webauthn-authenticate, send-booking-email, send-appointment-notification, save-smtp-config, seed-demo-accounts)
- [ ] **Edge Functions – Secrets:** ak Edge Functions potrebujú SMTP alebo iné tajomstvá, nastaviť v Dashboard → Edge Functions → Secrets (alebo cez CLI)
- [ ] **Seed dát (voliteľné):** spustiť docs/seed-demo.sql pre demo business a služby/zamestnancov

---

## 3. Firebase Console

URL: **https://console.firebase.google.com/** → projekt **phd-booking**

- [ ] **Authentication → Sign-in method:** povoliť Email/Password (a voliteľne iné poskytovateľe)
- [ ] **Authentication → Settings → Authorized domains:** pridať `booking.papihairdesign.sk` (a localhost pre dev)
- [ ] **Hosting:** po prvom deployi (npm run deploy:firebase alebo deploy:firebase:first) prípadne pridať **vlastnú doménu** – pozri docs/CUSTOM-DOMAIN.md (booking.papihairdesign.sk, DNS záznamy u poskytovateľa)
- [ ] **App Check (voliteľné):** Manage debug tokens – token už máte (FFAD7D74-...); ak zapnete App Check pre web app, nastaviť VITE_APP_CHECK_DEBUG_TOKEN v .env
- [ ] **Functions (len pri Blaze):** po upgrade na Blaze – Environment variables / Konfigurácia: **RECAPTCHA_SECRET** = secret key z reCAPTCHA (ak overujete tokeny na serveri)
- [ ] **Usage and billing:** ak chceš nasadiť Cloud Functions, upgrade na **Blaze** (docs/FIREBASE-SPARK-AUDIT.md, docs/MIGRATION-FIREBASE.md)

---

## 4. ReCAPTCHA (voliteľné)

- [ ] **Frontend:** v `.env` pridať **VITE_RECAPTCHA_SITE_KEY** = site key (verejný)
- [ ] **Backend (Firebase Functions po Blaze):** v konfigurácii Functions pridať **RECAPTCHA_SECRET** = secret key (tajný) – nikdy do .env vo frontende
- [ ] Pozri docs/RECAPTCHA.md

---

## 5. Hosting / deploy

- [ ] **Firebase Hosting (Spark):** `npm run deploy:firebase` (len SPA) alebo `npm run deploy:firebase:first` (hosting + firestore rules/indexy) – nevyžaduje Blaze
- [ ] **Firebase – vlastná doména:** v Firebase Console → Hosting pridať doménu `booking.papihairdesign.sk` a nastaviť DNS (docs/CUSTOM-DOMAIN.md)
- [ ] **Vercel (ak používaš):** Project → Settings → Environment Variables – pridať rovnaké VITE_* premenné ako v .env; Settings → Domains – pridať booking.papihairdesign.sk ak deployuješ na Vercel
- [ ] **Vercel – súkromný org repozitár:** ak máš Hobby plán a repo je pod organizáciou, riešenie v docs/VERCEL-HOBBY-ORG-REPO.md

---

## 6. Jednorazové / overenie

- [x] **Package manager:** projekt používa len npm (`package-lock.json`); závislosti bez známych zraniteľností (`npm audit`).
- [ ] **.firebaserc:** projekt je nastavený na `phd-booking` – ak používaš iný projekt, zmeň
- [ ] **Firebase CLI:** `npm install -g firebase-tools` a `firebase login` (pre deploy)
- [ ] **Supabase CLI (voliteľné):** ak linkuješ projekt alebo pushuješ auth config – `supabase login`, `supabase link` (docs/AUTH-BOOKING-DOMAIN.md)
- [ ] **Lokálny beh:** `npm run setup` resp. `npm install`, potom `npm run dev` – app na http://localhost:8080
- [ ] **Build:** `npm run build` – bez chýb pred deployom

---

## 7. Dokumentácia – odkazy

| Čo | Dokument |
|----|----------|
| **Čo funguje / nefunguje (Spark, Supabase, Edge Functions)** | docs/STATUS-FUNKCNOST.md |
| **Nastavenie všetko cez CLI (plán)** | docs/SETUP-CLI-PLAN.md |
| Spark vs Blaze, čo funguje bez platenia | docs/FIREBASE-SPARK-AUDIT.md |
| Náhrada Firebase Functions (Supabase) | docs/SUPABASE-AS-BACKEND.md |
| Firebase deploy, Blaze, Functions setup | docs/MIGRATION-FIREBASE.md |
| Vlastná doména booking.papihairdesign.sk | docs/CUSTOM-DOMAIN.md |
| Auth na produkčnej doméne | docs/AUTH-BOOKING-DOMAIN.md |
| ReCAPTCHA v3 | docs/RECAPTCHA.md |
| Pridanie owner admina v Supabase | docs/supabase-add-owner-admin.sql |
| Príprava vývoja, npm/pnpm | docs/DEVELOPMENT-SETUP.md |

---

## 8. Rozhodnutia (zhrnutie)

- **Backend rezervácií:** Supabase (Edge Functions) **alebo** Firebase (Cloud Functions – vyžaduje Blaze). V .env podľa toho nastaviť VITE_FIREBASE_FUNCTIONS_URL alebo nechať prázdnu a mať VITE_SUPABASE_*.
- **Auth:** Firebase Auth **alebo** Supabase Auth – podľa VITE_FIREBASE_* vs Supabase redirect/Site URL.
- **Hosting:** Firebase Hosting **alebo** Vercel – podľa toho nastaviť env a doménu na príslušnej platforme.

Po dokončení položiek vyššie by mali rezervácie (cez Supabase), prihlásenie, admin práva a deploy fungovať podľa zvolenej konfigurácie.

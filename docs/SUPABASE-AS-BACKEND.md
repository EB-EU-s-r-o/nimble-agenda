# Supabase ako náhrada za Firebase Functions (bez Blaze)

Na **Spark** pláne nemôžete nasadiť **Firebase Cloud Functions**. Náhrada: použiť **Supabase** – máte ho v projekte, **Edge Functions** bežia na bezplatnom tieri a pokrývajú rovnakú logiku ako Firebase Functions.

## Čo môžete dať na Supabase namiesto Firebase Functions

| Funkcia | Firebase (vyžaduje Blaze) | Náhrada – Supabase |
|--------|----------------------------|---------------------|
| Verejná rezervácia | `createPublicBooking` (HTTP) | Edge Function **create-public-booking** (HTTP / invoke) |
| Claim rezervácie | `claimBooking` (callable) | Edge Function **claim-booking** |
| Offline sync | `syncPush` / `syncPull` (callable) | Edge Functions **sync-push** / **sync-pull** |
| Passkey (WebAuthn) | webauthn* (callable) | Edge Functions **webauthn-register** / **webauthn-authenticate** |
| E-maily / notifikácie | sendBookingEmail, sendAppointmentNotification | **send-booking-email**, **send-appointment-notification** |
| SMTP nastavenia | `saveSmtpConfig` (callable) | **save-smtp-config** |
| Demo účty | `seedDemoAccounts` (callable) | **seed-demo-accounts** |

Všetky tieto Edge Functions už v projekte máte v `supabase/functions/`.

## Dáta: Supabase (PostgreSQL) vs Firestore

- **Supabase Edge Functions** píšu a čítajú z **Supabase (PostgreSQL)** – nie z Firestore.
- Ak chcete rezervácie a celý booking flow na Supabase bez Blaze, **zdroj pravdy** pre appointments, customers, booking_claims, atď. musí byť **Supabase** (vaše migrácie a tabuľky).
- **Firebase** potom môžete nechať na: Hosting (SPA), prípadne Auth (prihlásenie) – Supabase client už vie použiť Firebase JWT cez `accessToken` v `client.ts`.

Architektúra „náhrady“:

- **Firebase (Spark):** Hosting, voliteľne Auth + Firestore pre niečo iné.
- **Supabase:** PostgreSQL (dáta pre rezervácie, business, employees, …) + Edge Functions (všetka logika vyššie).

## Čo nastaviť

1. **Premenné prostredia (frontend)**  
   V `.env` (a na hostingu) mať napr.:
   - `VITE_SUPABASE_URL` = vaša Supabase project URL  
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = anon key  

2. **Supabase projekt**  
   - Prepojiť projekt: `npx supabase link` (project ref z Dashboardu).  
   - Nahrať migrácie a nasadiť Edge Functions jedným príkazom: `npm run supabase:setup` (alebo `npx supabase db push` a potom `npx supabase functions deploy`).  
   - V Supabase Dashboard nastaviť secrets pre Edge Functions (SMTP, atď.) podľa potreby.

3. **Frontend – ktorý backend volať**  
   - Ak je nastavená `VITE_FIREBASE_FUNCTIONS_URL` → volať **Firebase** (createPublicBooking, callables).  
   - Ak nie je, ale je `VITE_SUPABASE_URL` → volať **Supabase** (Edge Functions + Supabase client).  
   Tak môžete na Spark mať plnú funkcionalitu cez Supabase a po prechode na Blaze prepnúť na Firebase Functions, ak budete chcieť.

## Konkrétne zmeny vo frontende

- **Rezervácia (verejná stránka):**  
  Buď jednotná vrstva (napr. `createPublicBooking` v `createPublicBooking.ts`), ktorá:
  - ak existuje `VITE_FIREBASE_FUNCTIONS_URL`, volá Firebase `createPublicBooking`;
  - inak volá Supabase Edge Function `create-public-booking` (fetch na `VITE_SUPABASE_URL/functions/v1/create-public-booking` alebo `supabase.functions.invoke('create-public-booking', { body })`).  
  BookingPage potom stále volá jednu funkciu (napr. `createPublicBooking`), ktorá interně rozhodne medzi Firebase a Supabase.

- **Claim po registrácii (Auth.tsx):**  
  Ak používate Supabase backend, volať Supabase Edge Function `claim-booking` namiesto Firebase callable `claimBooking` (napr. cez `supabase.functions.invoke('claim-booking', { body: { claim_token } })`).

- **Sync (offline):**  
  V `lib/offline/sync.ts` volať Supabase **sync-push** / **sync-pull** namiesto Firebase callables (napr. `supabase.functions.invoke('sync-push', { body: { actions } })`).

- **WebAuthn, SMTP, seed:**  
  Analogicky – miesta, ktoré teraz volajú Firebase Functions, prepnúť na volanie príslušných Supabase Edge Functions (invoke alebo fetch), keď bežíte „bez Blaze“ a chcete náhradu.

## Predvolená SMTP (Papi Hair Design)

V kalendári (Admin → Nastavenia → SMTP) je predvyplnená konfigurácia pre **Websupport**:

- **Host:** `smtp.m1.websupport.sk`, **port:** 465 (SSL)
- **Odosielateľ / prijemca:** `booking@papihairdesign.sk`

Heslo SMTP sa nikde neukladá v kóde – používateľ ho zadá v Nastaveniach a uloží cez **save-smtp-config** (Supabase) alebo ekvivalent pri Firebase. Odoslané e-maily idú z `booking@papihairdesign.sk` a odpovede prichádzajú na ten istý e-mail.

## Zhrnutie

- **Náhrada za Firebase Functions na Spark = Supabase:** Edge Functions + PostgreSQL.
- **Čo dať na Supabase:** rezervácie (create-public-booking), claim-booking, sync-push/pull, webauthn, e-maily, send-appointment-notification, save-smtp-config, seed-demo-accounts – všetko, čo máte v `supabase/functions/`.
- **Firebase** môže zostať na Hosting (+ voliteľne Auth/Firestore); bez Blaze nepotrebujete žiadne Firebase Functions, ak backend pre tieto funkcie presuniete na Supabase.

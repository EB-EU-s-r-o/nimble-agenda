# Migrácia na Firebase (Firestore + Cloud Functions)

Tento dokument popisuje implementovanú migráciu z Supabase (PostgreSQL + Edge Functions) na Firebase (Firestore + Cloud Functions).

## Čo bolo implementované

### Fáza 1 – Firestore schéma a pravidlá
- **docs/FIRESTORE-SCHEMA.md** – mapovanie tabuliek na kolekcie, polia, indexy
- **firestore.rules** – bezpečnostné pravidlá (auth, memberships s compound ID `profile_id_business_id`)
- **firestore.indexes.json** – zložené indexy pre appointments, business_hours, memberships, schedules, sync_dedup
- **firebase.json** – pridaná sekcia `firestore` (rules, indexes) a `functions`

### Fáza 2 – Migračné skripty
- **scripts/migrate-supabase-to-firestore/export-supabase.ts** – export tabuliek z Supabase do JSON
- **scripts/migrate-supabase-to-firestore/transform-and-import.ts** – transformácia a zápis do Firestore (dávky po 500), memberships s doc ID `profile_id_business_id`
- **scripts/migrate-supabase-to-firestore/run-migration.ts** – spustenie exportu + importu
- **scripts/migrate-supabase-to-firestore/README.md** – návod na beh

### Fáza 3 – Cloud Functions (functions/)
- **createPublicBooking** – HTTP, verejné vytvorenie rezervácie (náhrada create-public-booking)
- **claimBooking** – callable, prepojenie rezervácie s účtom
- **syncPush** / **syncPull** – callable, offline sync
- **sendBookingEmail** / **sendAppointmentNotification** – HTTP, e-maily
- **webauthnRegisterChallenge** / **webauthnRegister** – callable, registrácia passkey
- **webauthnAuthenticateChallenge** / **webauthnAuthenticate** – callable, prihlásenie cez passkey (vracia custom token)
- **saveSmtpConfig** – callable, uloženie SMTP
- **seedDemoAccounts** – callable, demo účty

### Fáza 4 – Frontend (Firebase namiesto Supabase)
- **Firebase config** – pridaný Firestore a Functions (europe-west1)
- **useBusinessInfo** – čítanie z Firestore (business, business_hours, overrides, quick_links), výpočet is_open / next_opening na klientovi
- **AuthContext** – len Firebase Auth + Firestore (profiles, memberships), normalizovaný user s `.id`
- **Auth.tsx** – prihlásenie/registrácia/forgot cez Firebase, claim-booking cez callable
- **BookingPage** – dáta z Firestore, odoslanie rezervácie cez **createPublicBooking** HTTP (potrebná `VITE_FIREBASE_FUNCTIONS_URL`)
- **MySchedulePage** – Firestore (employees, appointments, update status)
- **CalendarPage** – Firestore (appointments, customers, services, employees, schedules, memberships, vytvorenie rezervácie, zmena statusu)
- **lib/offline/sync.ts** – syncPush a syncPull cez callable
- **useWebAuthn** – webauthn challenge/register/authenticate cez callable, prihlásenie cez `signInWithCustomToken`
- **DiagnosticsPage** – Firebase Auth a Firestore namiesto Supabase

### Fáza 5 – Offline sync
- Sync už volá Cloud Functions (syncPush, syncPull) – implementované v rámci Fázy 4.

## Premenné prostredia (frontend)

- **Firebase (existujúce):**  
  `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`
- **Pre verejné rezervácie (BookingPage):**  
  **VITE_FIREBASE_FUNCTIONS_URL** – základná URL HTTP Cloud Functions, napr.  
  `https://europe-west1-phd-booking.cloudfunctions.net`  
  (bez koncového lomítka; createPublicBooking sa volá ako POST na `/createPublicBooking`)

## Firebase plán (Spark vs Blaze) a deploy

- **Spark (zadarmo):** môžete nasadiť len **Hosting** a **Firestore** (rules + indexy). Cloud Functions sa na tomto pláne nasadiť nedajú.
- **Blaze (pay-as-you-go):** potrebný pre **Cloud Functions** (Cloud Build, Artifact Registry). Bez Blaze pri `firebase deploy` dostanete chybu, že projekt musí byť na Blaze pláne.
- **Upgrade na Blaze:**  
  [Konzola → Usage and billing](https://console.firebase.google.com/project/phd-booking/usage/details) → upgrade. Blaze má stále bezplatný kvóty (napr. Functions invocations), platí sa nad rámec.

**Príkazy deploy podľa plánu:**

| Čo nasadiť | Príkaz | Plán |
|------------|--------|------|
| Len hosting (SPA z `dist`) | `npm run deploy:firebase` (= `npm run build && firebase deploy --only hosting`) | Spark |
| Hosting + Firestore (rules, indexy) | `npm run build && firebase deploy --only hosting,firestore` | Spark |
| Všetko (hosting + firestore + functions) | `npm run build && firebase deploy` | **Blaze** |

Ak chcete používať rezervácie, webauthn, e-maily a ďalšie Cloud Functions, musíte mať projekt na Blaze a nasadiť functions. **Kompletný audit:** [docs/FIREBASE-SPARK-AUDIT.md](FIREBASE-SPARK-AUDIT.md). **Náhrada bez Blaze:** [docs/SUPABASE-AS-BACKEND.md](SUPABASE-AS-BACKEND.md) – Supabase Edge Functions + PostgreSQL.

## Set up Functions (inštalácia a prvý deploy)

Podľa [Firebase Console → Functions](https://console.firebase.google.com/project/phd-booking/functions) a getting started:

1. **Inštalácia Firebase CLI (Node.js potrebný)**  
   ```bash
   npm install -g firebase-tools
   ```  
   Ak príkaz zlyháva, môže byť potrebné upraviť oprávnenia npm (napr. [fixing npm permissions](https://docs.npmjs.com/resolving-eaxcces-permissions-when-installing-packages-globally)).

2. **Inicializácia projektu (ak ešte nebežala)**  
   V koreni repozitára:  
   ```bash
   firebase init
   ```  
   Vyberte Functions (a prípadne Hosting, Firestore). V tomto projekte je už `firebase.json` a priečinok `functions/`, takže môžete preskočiť na krok 3.

3. **Deploy**  
   - Len Functions:  
     ```bash
     cd functions
     npm install
     npm run build
     firebase deploy --only functions
     ```  
   - Alebo z koreňa projektu všetko (hosting + firestore + functions):  
     ```bash
     npm run build && firebase deploy
     ```  
   **Poznámka:** Plný deploy (vrátane functions) vyžaduje **Blaze** plán. Na Spark použite `npm run deploy:firebase:first` (hosting + firestore).

Po deployi nastavte vo frontende `VITE_FIREBASE_FUNCTIONS_URL` na skutočnú základnú URL (napr. z výstupu `firebase deploy`).

## Stránky ešte používajúce Supabase

Nasledujúce stránky/komponenty stále volajú Supabase a treba ich doplniť/prepísať na Firestore + callable podľa potreby:

- DashboardPage, AppointmentsPage, CustomersPage, EmployeesPage, ServicesPage  
- SettingsPage (business + profile + save-smtp-config callable)  
- ReceptionPage, OnboardingWizard, BusinessHoursEditor  
- useOnboarding, MobileCalendarShell, LiquidPlayground  

Po ich prepísaní môžete odstrániť závislosti na Supabase z projektu.

## Bezpečnosť

- Firestore rules predpokladajú **compound document ID** pre memberships: `profile_id + '_' + business_id`.
- V migračnom skripte (transform-and-import) sa pre memberships používa tento ID.
- Vytvorenie rezervácií z verejnej stránky je len cez Cloud Function **createPublicBooking** (klient nemá priamy zápis do `appointments`).

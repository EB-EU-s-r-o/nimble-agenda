# Plán nastavenia projektu cez CLI

Všetko, čo sa dá nastaviť z príkazového riadka (PowerShell / CMD), v logickom poradí. Jednorazové kroky aj opakovateľné deploye.

---

## Predpoklady

- **Node.js 18+** – `node -v`
- **Package manager:** npm (projekt používa len npm a `package-lock.json`)
- **PowerShell** (Windows) – pre skripty `.ps1`

Voliteľne nainštalované globálne (alebo cez `npx`):

- `firebase-tools` – Firebase CLI
- `supabase` – Supabase CLI (v projekte je v devDependencies → `npx supabase`)
- `vercel` – Vercel CLI
- `psql` – PostgreSQL klient (ak budeš spúšťať migrácie cez psql namiesto Supabase CLI)

---

## 1. Lokálne prostredie (jednorazovo)

### 1.1 Závislosti a .env

```powershell
cd c:\Users\42195\nimble-agenda

# Príprava (Node check + install + .env z .env.example)
npm run setup
# alebo:  .\setup.ps1
```

### 1.2 Vyplniť .env

Súbor `.env` uprav **ručne** v editore (CLI nemá prístup k tajným kľúčom). Potrebné aspoň:

- **Supabase:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- **Firebase (ak používaš):** `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_APP_ID`, …
- **Functions (ak Firebase Blaze):** `VITE_FIREBASE_FUNCTIONS_URL`

Project ref pre Supabase nájdeš v URL dashboardu: `https://supabase.com/dashboard/project/<PROJECT_REF>`.

---

## 2. Supabase (ak používaš Supabase ako backend)

Nastav `PROJECT_REF` na svoj Supabase project ref (v skriptoch je default `hrkwqdvfeudxkqttpgls`).

### 2.1 Prihlásenie a prepojenie projektu

```powershell
cd c:\Users\42195\nimble-agenda

npx supabase login
npx supabase link --project-ref <PROJECT_REF>
```

Skripty v koreni používajú default project ref; môžeš ho zmeniť parametrom:

```powershell
.\supabase-db-push.ps1 -ProjectRef <PROJECT_REF>
.\supabase-push-auth-config.ps1   # v skripte zmeň $ProjectRef ak treba
```

### 2.2 Migrácie databázy (tabuľky, RPC, seed)

**Cesta A – Supabase CLI (odporúčané, potrebný prístup do tímu):**

```powershell
.\supabase-db-push.ps1
# alebo s iným projektom:
.\supabase-db-push.ps1 -ProjectRef <PROJECT_REF>
```

Ekvivalent priamo cez CLI:

```powershell
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

**Cesta B – psql (ak nemáš Supabase CLI / týmový prístup):**

```powershell
# Heslo z Supabase Dashboard → Settings → Database
$env:PGPASSWORD = "tvoje_db_heslo"
.\supabase-db-push-psql.ps1 -ProjectRef <PROJECT_REF>
```

### 2.3 Auth konfigurácia (Site URL, Redirect URLs)

Predtým v `supabase/config.toml` skontroluj `[auth]` – `site_url` a `additional_redirect_urls` (napr. `https://booking.papihairdesign.sk`). Potom:

```powershell
.\supabase-push-auth-config.ps1
```

Ekvivalent:

```powershell
npx supabase link --project-ref <PROJECT_REF>
npx supabase config push
```

### 2.4 Edge Functions – nasadenie

Všetky funkcie naraz:

```powershell
npm run supabase:deploy-functions
# alebo:  npx supabase functions deploy
```

Jednotlivo (ak potrebuješ len niektoré):

```powershell
npx supabase functions deploy create-public-booking
npx supabase functions deploy claim-booking
npx supabase functions deploy sync-push
npx supabase functions deploy sync-pull
npx supabase functions deploy send-booking-email
npx supabase functions deploy send-appointment-notification
npx supabase functions deploy webauthn-register
npx supabase functions deploy webauthn-authenticate
npx supabase functions deploy save-smtp-config
npx supabase functions deploy seed-demo-accounts
```

### 2.5 Secrets pre Edge Functions

SMTP a iné tajomstvá (nie do .env frontendu):

```powershell
npx supabase secrets set SMTP_HOST=smtp.example.com
npx supabase secrets set SMTP_USER=...
npx supabase secrets set SMTP_PASS=...
# podľa potreby ďalšie
npx supabase secrets list
```

### 2.6 Jednorazový SQL (owner/admin, seed)

**Supabase Dashboard → SQL Editor** – spusti obsah súboru:

- `docs/supabase-add-owner-admin.sql` – owner práva pre zvolený email
- `docs/seed-demo.sql` – voliteľný demo seed

Cez CLI (psql):

```powershell
$env:PGPASSWORD = "tvoje_db_heslo"
psql "postgresql://postgres@db.<PROJECT_REF>.supabase.co:5432/postgres" -f docs/supabase-add-owner-admin.sql
psql "postgresql://postgres@db.<PROJECT_REF>.supabase.co:5432/postgres" -f docs/seed-demo.sql
```

---

## 3. Firebase (Hosting, Firestore, Functions)

Projekt je v `.firebaserc` nastavený na `phd-booking`. Ak používaš iný projekt, uprav `.firebaserc`.

### 3.1 Prihlásenie a výber projektu

```powershell
npm install -g firebase-tools
firebase login
firebase use default
# alebo:  firebase use <project-id>
```

### 3.2 Deploy Hosting (SPA) – funguje na Spark (zadarmo)

```powershell
npm run deploy:firebase
# alebo:  npm run build ; firebase deploy --only hosting
```

### 3.3 Deploy Hosting + Firestore (rules + indexy) – Spark

```powershell
npm run deploy:firebase:first
# alebo:  npm run build ; firebase deploy --only hosting,firestore
```

### 3.4 Deploy Cloud Functions – vyžaduje Blaze plán

```powershell
npm run build
firebase deploy --only functions
# alebo všetko:  firebase deploy
```

Po deployi nastav vo frontende `VITE_FIREBASE_FUNCTIONS_URL` (základná URL Functions, napr. `https://europe-west1-phd-booking.cloudfunctions.net`).

---

## 4. Vercel (ak hostuješ na Vercel)

### 4.1 Prepojenie projektu

```powershell
npm install -g vercel
vercel link
# zvoľ existujúci projekt alebo vytvor nový
```

### 4.2 Env premenné z .env (skripty)

```powershell
.\scripts\set-vercel-supabase-env.ps1    # Supabase
.\scripts\set-vercel-firebase-env.ps1    # Firebase (ak používaš)
.\scripts\set-vercel-token-env.ps1       # VERCEL_TOKEN pre automatický deploy
```

### 4.3 Deploy

```powershell
.\scripts\deploy-vercel.ps1
# alebo priamo:
vercel --prod
```

Overenie env:

```powershell
vercel env ls production
vercel list
```

---

## 5. Komplexný setup (Firebase Auth + Supabase DB)

Ak používaš Firebase Auth a Supabase ako databázu, jeden skript zreťazí viacero krokov:

```powershell
.\scripts\firebase-setup-complete.ps1
# s iným Supabase projektom:
.\scripts\firebase-setup-complete.ps1 -SupabaseProjectRef <PROJECT_REF>
```

Skript: npm install, Supabase db push, Firebase migrácie cez psql (ak je `SUPABASE_DB_URL`), Supabase config push (Third-Party Auth), Vercel env. Niektoré veci (vytvorenie Firebase projektu, zapnutie Auth metód, custom claims) sa stále robia v Firebase Console.

---

## 6. Overenie pred deployom

```powershell
npm run lint
npm run test
npm run build
npm run lockin:check
# voliteľne:  npm run budget
```

---

## 7. Zhrnutie príkazov podľa scenára

| Cieľ | Príkazy (v koreni projektu) |
|------|-----------------------------|
| **Prvá príprava** | `npm run setup` → upraviť `.env` |
| **Supabase migrácie** | `npx supabase login` → `.\supabase-db-push.ps1` (prípadne `-ProjectRef`) |
| **Supabase auth URL** | Upraviť `supabase/config.toml` → `.\supabase-push-auth-config.ps1` |
| **Supabase Edge Functions** | `npm run supabase:deploy-functions` alebo `npx supabase functions deploy` |
| **Supabase secrets** | `npx supabase secrets set ...` |
| **Firebase hosting** | `npm run deploy:firebase` |
| **Firebase hosting + Firestore** | `npm run deploy:firebase:first` |
| **Firebase Functions** | Blaze → `npm run build` → `firebase deploy --only functions` |
| **Vercel env** | `.\scripts\set-vercel-supabase-env.ps1` / `set-vercel-firebase-env.ps1` |
| **Vercel deploy** | `.\scripts\deploy-vercel.ps1` alebo `vercel --prod` |
| **Všetko Supabase (db + functions)** | `pnpm supabase:setup` (= db push + functions deploy) |

---

## 8. Poznámky

- **Project ref:** V skriptoch `supabase-db-push.ps1` a `supabase-push-auth-config.ps1` je default `hrkwqdvfeudxkqttpgls`. Ak používaš iný projekt, použi parameter `-ProjectRef <REF>` alebo uprav premennú v skripte.
- **Supabase vs Firebase backend:** Ak používaš len Supabase (bez Blaze), nechaj `VITE_FIREBASE_FUNCTIONS_URL` prázdnu; rezervácie pôjdu cez Supabase Edge Functions. Ak používaš Firebase Functions, nastav URL a potrebuješ Blaze.
- **Detaily:** Auth doména – [docs/AUTH-BOOKING-DOMAIN.md](AUTH-BOOKING-DOMAIN.md). Migrácie – [MIGRATIONS-TERMINAL.md](MIGRATIONS-TERMINAL.md). Firebase – [MIGRATION-FIREBASE.md](MIGRATION-FIREBASE.md). Vercel – [scripts/README.md](../scripts/README.md).

### Cursor MCP (Supabase)

V `.cursor/mcp.json` je nastavený Supabase MCP server pre projekt **hrkwqdvfeudxkqttpgls**. Po zmene tohto súboru je potrebné **načítať novú konfiguráciu**: Command Palette (Ctrl+Shift+P) → **Developer: Reload Window**. Alternatíva: reštart Cursoru.

# PAPI HAIR DESIGN – Booking System

> Moderný rezervačný systém pre salóny krásy. React 18 PWA + Supabase Cloud backend.

---

## Obsah

- [Architektúra](#architektúra)
- [Rýchly štart](#rýchly-štart)
- [Premenné prostredia](#premenné-prostredia)
- [Auth na produkčnej doméne](#auth-na-produkčnej-doméne-bookingpapihairdesignsk)
- [Firebase Auth (voliteľné)](#firebase-auth-voliteľné)
- [Práca na projekte (prístup odkiaľkoľvek)](#práca-na-projekte-prístup-odkiaľkoľvek)
- [Vercel Hobby a súkromný org repozitár](#vercel-hobby-a-súkromný-org-repozitár)
- [Návod na používanie](#návod-na-používanie)
  - [Zákazník](#zákazník--booking)
  - [Zamestnanec](#zamestnanec--adminmy)
  - [Admin / Majiteľ](#admin--majiteľ--admin)
- [Demo účty](#demo-účty)
- [Štruktúra projektu](#štruktúra-projektu)
- [Stránky a routy](#stránky-a-routy)
- [Edge Functions](#edge-functions)
- [Databáza a migrácie](#databáza-a-migrácie)
- [Offline podpora](#offline-podpora)
- [PWA inštalácia](#pwa-inštalácia)
- [Bezpečnosť](#bezpečnosť)
- [Vývoj a testovanie](#vývoj-a-testovanie)
- [Changelog](#changelog)

---

## Architektúra

```
React 18 + Vite + TypeScript
├── shadcn/ui + Tailwind CSS        — UI komponenty a štýlovanie
├── Framer Motion                   — Animácie
├── TanStack React Query            — Server state management
├── Dexie.js (IndexedDB)            — Offline-first lokálna databáza
├── vite-plugin-pwa (Workbox)       — PWA + service worker
└── Supabase Cloud
    ├── PostgreSQL + RLS            — Databáza s bezpečnostnými politikami
    ├── Supabase Auth               — Autentifikácia (email, OAuth, Passkeys)
    └── Edge Functions (Deno)       — Serverless logika
```

### Tok dát

```
┌─────────────┐     ┌──────────────┐     ┌───────────────────┐
│  Zákazník   │────▶│  /booking    │────▶│  create-public-   │
│  (telefón)  │     │  výber       │     │  booking (edge fn)│
└─────────────┘     │  termínu     │     └────────┬──────────┘
                    └──────────────┘              │ e-mail
                                                  ▼
┌─────────────┐     ┌──────────────┐     ┌───────────────────┐
│  Admin      │◀────│  /admin      │◀────│  Nová rezervácia  │
│  (dashboard)│     │  kalendár    │     │  v databáze       │
└─────────────┘     └──────────────┘     └───────────────────┘
```

---

## Rýchly štart

### Požiadavky

- Node.js 18+
- Git

### Inštalácia

**Automatická príprava prostredia (odporúčané):**

```sh
# Z koreňa projektu (Node.js 18+ potrebný)
npm run setup
# alebo priamo:
.\setup.ps1
```

Skript skontroluje Node.js, nainštaluje závislosti a vytvorí `.env` z `.env.example` (ak ešte neexistuje).

**Manuálne:**

```sh
# 1. Klonuj repozitár
git clone https://github.com/EB-EU-s-r-o/nimble-agenda.git
cd nimble-agenda

# 2. (Voliteľne) Nastav Node 18+ cez nvm: nvm use
# 3. Nainštaluj závislosti
npm install

# 4. Nastav premenné prostredia
cp .env.example .env   # na Windows: copy .env.example .env
# Vyplň hodnoty v .env

# 5. Spusti vývojový server
npm run dev
```

App bude dostupná na **http://localhost:8080**

### Dostupné príkazy

| Príkaz | Popis |
|--------|-------|
| `npm run dev` | Spustí vývojový server (Vite HMR) |
| `npm run build` | Produkčný build |
| `npm run build:dev` | Build v dev móde (so zdrojovými mapami) |
| `npm run preview` | Náhľad produkčného buildu lokálne |
| `npm run lint` | ESLint kontrola kódu |
| `npm run test` | Spusti všetky testy (Vitest) |
| `npm run test:watch` | Testy v sledovacom móde |

---

## Premenné prostredia

Skopíruj `.env.example` do `.env` a vyplň hodnoty:

```env
VITE_SUPABASE_PROJECT_ID=tvoj-project-id
VITE_SUPABASE_URL=https://tvoj-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=tvoj-anon-key
```

> Hodnoty nájdeš v Supabase dashboarde pod **Settings → API**.

### Auth na produkčnej doméne (booking.papihairdesign.sk)

Aby prihlásenie fungovalo na **https://booking.papihairdesign.sk**, treba v Supabase nastaviť Site URL a Redirect URLs (cez `.\supabase-push-auth-config.ps1` alebo ručne v Dashboarde). Kompletný postup, čo nerobiť (napr. nevkladať obsah `config.toml` do terminálu) a kde hľadať chybu: **[docs/AUTH-BOOKING-DOMAIN.md](docs/AUTH-BOOKING-DOMAIN.md)**.

### Firebase Auth (voliteľné)

Ak chceš použiť **Firebase Authentication** namiesto Supabase Auth (email/heslo, Google), nastav v `.env` premenné `VITE_FIREBASE_*` a v Supabase povol Third-Party Auth (Firebase). Plný návod: **[docs/FIREBASE-AUTH-SETUP.md](docs/FIREBASE-AUTH-SETUP.md)**.

### Práca na projekte (prístup odkiaľkoľvek)

- **Práca s kódom a deploy (GitHub + Vercel)**  
  Stačí prihlásenie na GitHub a prístup k Vercel projektu. Môžeš klonovať repozitár, pushovať zmeny a spúšťať deploy odkiaľkoľvek. Env premenné sú nastavené v Vercel projekte; na novom počítači po clone pridaj lokálne `.env` podľa `.env.example` (ak potrebuješ lokálny vývoj).

- **Plná správa Supabase projektu (auth URL, CLI)**  
  Na správu Supabase z ktoréhokoľvek miesta (vrátane `supabase link` a `supabase config push`) musíš byť pridaný do **Supabase tímu**: Owner/Admin ťa pozve v **Supabase Dashboard → Organization → Team → Invite** (email). Po prijatí pozvánky môžeš odkiaľkoľvek spustiť `supabase login` a `.\supabase-push-auth-config.ps1`. Ak si v tíme a pozvánku si prijal, ďalšie nastavenie nie je potrebné.

Ak na produkcii (Vercel) **/booking neukazuje služby** a diagnostika hlási chýbajúce tabuľky/RPC, pozri **[docs/FIX-PRODUCTION.md](docs/FIX-PRODUCTION.md)**.

Ak Vercel zobrazí *"The repository is private and owned by an organization, which is not supported on the Hobby plan"*, pozri **[docs/VERCEL-HOBBY-ORG-REPO.md](docs/VERCEL-HOBBY-ORG-REPO.md)** (prevod repa na osobný účet alebo nové osobné repo).

### Vercel Hobby a súkromný org repozitár

Vercel Hobby nepodporuje deploy zo súkromného repozitára vlastneného **organizáciou**. Ak pripájaš taký repo, dostaneš chybu. Riešenie: mať repozitár pod osobným účtom (prevod vlastníctva alebo nové osobné repo). Detailný postup a pomocné skripty: **[docs/VERCEL-HOBBY-ORG-REPO.md](docs/VERCEL-HOBBY-ORG-REPO.md)**.

---

## Návod na používanie

### Zákazník – `/booking`

Verejná stránka, nevyžaduje prihlásenie.

1. **Výber služby** – Zákazník vyberie typ služby (strihanie, farbenie, atď.)
2. **Výber zamestnanca** – Voliteľne konkrétny zamestnanec alebo „ktokoľvek dostupný"
3. **Výber termínu** – Kalendár s dostupnými slotmi generovanými v reálnom čase
4. **Kontaktné údaje** – Meno, email/telefón, poznámka
5. **Potvrdenie** – Systém pošle e-mail s potvrdením rezervácie

**Pravidlá rezervácie** (konfigurovateľné v nastaveniach prevádzky):
- `lead_time_minutes` – minimálny čas dopredu
- `max_days_ahead` – maximálny horizont rezervácie
- `cancellation_hours` – do kedy je možné stornovať

---

### Zamestnanec – `/admin/my`

Prihlásenie na `/auth` s rolou `employee`.

1. **Môj rozvrh** – Zobrazuje iba vlastné termíny (vynútené RLS politikami)
2. **Označenie stavu** – Termín je možné označiť ako `completed`
3. **Detaily termínu** – Zákazník, služba, čas, poznámka

> Zamestnanec nevidí termíny kolegov ani obchodné štatistiky.

---

### Admin / Majiteľ – `/admin`

Prihlásenie na `/auth` s rolou `admin` alebo `owner`.

| Sekcia | Route | Popis |
|--------|-------|-------|
| Dashboard | `/admin` | Dnešné termíny, štatistiky, prehľad |
| Kalendár | `/admin/calendar` | Deň / týždeň / mesiac zobrazenie |
| Termíny | `/admin/appointments` | Zoznam, filtrovanie, zmena stavu |
| Zamestnanci | `/admin/employees` | Správa personálu, rozvrhy |
| Služby | `/admin/services` | Katalóg, ceny, trvanie |
| Zákazníci | `/admin/customers` | Databáza zákazníkov s históriou |
| Nastavenia | `/admin/settings` | Prevádzka, hodiny, pravidlá |
| Recepcia | `/reception` | Rýchle rezervácie, offline mód |

---

## Demo účty

| Rola | Email | Heslo | Prístup |
|------|-------|-------|---------|
| Zákazník | `demo@papihairdesign.sk` | `PapiDemo2025!` | `/booking` |
| Majiteľ / Admin | `owner@papihairdesign.sk` | `PapiDemo2025!` | `/admin` (plný prístup) |
| Superadmin | `larsenevans@proton.me` | — kontaktujte nás — | Multi-business správa |

**Demo prevádzka:** Papi Hair Studio
**Demo business ID:** `a1b2c3d4-0000-0000-0000-000000000001`
**Seed dáta:** `docs/seed-demo.sql`

---

## Štruktúra projektu

```
nimble-agenda/
├── src/
│   ├── App.tsx                    # Hlavný komponent, routing
│   ├── main.tsx                   # Entry point
│   ├── pages/
│   │   ├── Auth.tsx               # Prihlásenie / registrácia
│   │   ├── BookingPage.tsx        # Verejná rezervácia
│   │   ├── DemoPage.tsx           # Showcase demo stránka
│   │   ├── ReceptionPage.tsx      # Recepcia
│   │   ├── OfflinePage.tsx        # Offline fallback
│   │   ├── InstallPage.tsx        # PWA inštalačný sprievodca
│   │   └── admin/
│   │       ├── DashboardPage.tsx
│   │       ├── CalendarPage.tsx
│   │       ├── AppointmentsPage.tsx
│   │       ├── EmployeesPage.tsx
│   │       ├── ServicesPage.tsx
│   │       ├── CustomersPage.tsx
│   │       ├── SettingsPage.tsx
│   │       └── MySchedulePage.tsx
│   ├── components/
│   │   ├── AdminLayout.tsx        # Admin sidebar + layout wrapper
│   │   ├── ProtectedRoute.tsx     # Route ochrana (auth guard)
│   │   ├── OnboardingWizard.tsx   # Setup pre nové prevádzky
│   │   ├── booking/               # Booking komponenty
│   │   ├── calendar/              # Kalendárové zobrazenia
│   │   └── ui/                    # shadcn/ui komponenty (70+)
│   ├── contexts/
│   │   └── AuthContext.tsx        # Globálny auth stav (user, memberships)
│   ├── hooks/
│   │   ├── useBusiness.ts         # Aktívna prevádzka + rola
│   │   ├── useBusinessInfo.ts     # Verejné info o prevádzke (RPC)
│   │   ├── useOnboarding.ts       # Onboarding stav
│   │   └── useWebAuthn.ts         # Passkey autentifikácia
│   ├── lib/
│   │   ├── availability.ts        # Generátor dostupných slotov
│   │   ├── timezone.ts            # Timezone utility (Intl API, bez závislostí)
│   │   └── offline/
│   │       ├── db.ts              # Dexie IndexedDB schéma
│   │       ├── reception.ts       # Offline dáta pre recepciu
│   │       └── sync.ts            # Sync engine (push/pull, každých 30s)
│   └── integrations/supabase/
│       ├── client.ts              # Supabase klient
│       └── types.ts               # Auto-generované DB typy
├── supabase/
│   ├── config.toml                # Supabase projekt konfigurácia
│   ├── functions/                 # Edge Functions (Deno)
│   └── migrations/                # SQL migrácie (verzionované)
├── docs/
│   ├── seed-demo.sql              # Demo seed dáta pre lokálny vývoj
│   └── ARCHITECTURE.md            # Detailná technická dokumentácia
├── .env.example                   # Vzor premenných prostredia
├── .gitignore
├── package.json
├── vite.config.ts                 # Vite + PWA konfigurácia
├── tailwind.config.ts
└── tsconfig.json
```

---

## Stránky a routy

| Route | Komponent | Auth | Popis |
|-------|-----------|------|-------|
| `/` | LiquidPlayground | — | Landing / úvodná stránka |
| `/demo` | DemoPage | — | Feature showcase |
| `/booking` | BookingPage | — | Verejná rezervácia |
| `/auth` | Auth | — | Prihlásenie / registrácia |
| `/offline` | OfflinePage | — | Offline fallback |
| `/install` | InstallPage | — | PWA inštalačný sprievodca |
| `/reception` | ReceptionPage | ✅ | Recepcia / front desk |
| `/admin` | DashboardPage | ✅ | Admin dashboard |
| `/admin/calendar` | CalendarPage | ✅ | Kalendár termínov |
| `/admin/appointments` | AppointmentsPage | ✅ | Zoznam termínov |
| `/admin/employees` | EmployeesPage | ✅ | Správa zamestnancov |
| `/admin/services` | ServicesPage | ✅ | Katalóg služieb |
| `/admin/customers` | CustomersPage | ✅ | Databáza zákazníkov |
| `/admin/settings` | SettingsPage | ✅ | Nastavenia prevádzky |
| `/admin/my` | MySchedulePage | ✅ | Osobný rozvrh zamestnanca |

---

## Edge Functions

Serverless funkcie na Supabase Edge (Deno runtime). Všetky majú `verify_jwt = false` – vlastná auth logika.

| Funkcia | Popis |
|---------|-------|
| `create-public-booking` | Vytvorenie rezervácie, validácia konfliktov, spustenie e-mailu |
| `claim-booking` | Priradenie rezervácie k účtu cez jednorazový token |
| `sync-push` | Odoslanie offline akcií na server (idempotentné) |
| `sync-pull` | Stiahnutie aktuálnych dát do offline DB |
| `send-booking-email` | Odoslanie e-mailového potvrdenia (SMTP) |
| `webauthn-register` | Registrácia passkey (WebAuthn challenge generation) |
| `webauthn-authenticate` | Prihlásenie passkey, generovanie magic link tokenu |
| `seed-demo-accounts` | Inicializácia demo dát (len pre development) |

---

## Databáza a migrácie

### Hlavné tabuľky

| Tabuľka | Popis |
|---------|-------|
| `profiles` | Profily užívateľov (prepojené na `auth.users`) |
| `businesses` | Prevádzky s nastaveniami a konfigom |
| `memberships` | Vzťah profil ↔ prevádzka ↔ rola |
| `employees` | Zamestnanci prevádzky |
| `services` | Katalóg služieb (cena, trvanie, buffer čas) |
| `appointments` | Rezervácie |
| `customers` | Zákazníci |
| `business_hours` | Pracovné hodiny po dňoch týždňa |
| `business_date_overrides` | Výnimky (sviatky, špeciálne dni) |
| `passkeys` | WebAuthn credentials |
| `sync_dedup` | Idempotency keys pre offline sync |

### RLS pomocné funkcie

```sql
is_business_admin(user_id uuid, business_id uuid)    → boolean
is_business_employee(user_id uuid, business_id uuid) → boolean
get_employee_id(user_id uuid, business_id uuid)      → uuid
```

### Lokálny vývoj s Supabase CLI

```sh
# Spusti lokálny Supabase stack (Docker)
supabase start

# Reset DB + aplikuj migrácie
supabase db reset

# Seed demo dát
psql postgresql://postgres:postgres@localhost:54322/postgres -f docs/seed-demo.sql

# Deploy edge functions lokálne
supabase functions serve
```

---

## Offline podpora

Systém funguje aj bez internetu pomocou **Dexie.js (IndexedDB)**.

```
Online  ──▶  Supabase Cloud
               ↕  sync každých 30s
Offline ──▶  IndexedDB (Dexie)
               ├── appointments  (lokálna kópia)
               ├── queue         (čakajúce akcie)
               └── meta          (čas posledného syncu)
```

**Sync flow:**
1. **PUSH** – pending akcie (create/update/cancel) sa odošlú cez `sync-push`
2. **PULL** – aktuálne dáta sa stiahnu cez `sync-pull`
3. **Konflikty** – server navrhuje alternatívne termíny
4. **Idempotentnosť** – každá akcia má `idempotency_key`

**OfflineBanner** sa zobrazí automaticky pri strate pripojenia.

---

## PWA inštalácia

Aplikácia je plnohodnotná Progressive Web App.

**Inštalácia:**
1. Otvor `/install` pre krok-za-krokom sprievodcu
2. Alebo klikni "Pridať na plochu" v prehliadači

| Vlastnosť | Hodnota |
|-----------|---------|
| Start URL | `/booking` |
| Display | `standalone` |
| Orientation | `portrait` |
| Theme color | `#0b0b0b` (AMOLED čierna) |
| Icons | 192×192 a 512×512 PNG |

**Caching (Workbox):**

| Typ obsahu | Stratégia | TTL |
|------------|-----------|-----|
| Supabase API | NetworkFirst | 1 hodina |
| Statické assety (JS/CSS/img) | CacheFirst | 30 dní |

---

## Bezpečnosť

- **Row Level Security (RLS)** – každá tabuľka, dáta izolované podľa `business_id`
- **Multi-tenant** – každá prevádzka vidí iba svoje dáta
- **Passkeys (WebAuthn)** – passwordless biometrické prihlásenie
- **Role-based access** – 4 roly: `owner` › `admin` › `employee` › `customer`
- **Zod validácia** – všetky vstupy validované na frontende aj v edge functions
- **Input sanitizácia** – v `create-public-booking` edge function
- **SMTP secrets** – uložené v Supabase edge function secrets (nie v kóde)

---

## Vývoj a testovanie

### Testy

```sh
npm run test         # jednorazový beh
npm run test:watch   # sledovací mód
npm run lint         # kontrola kódu
```

Testy: `src/test/` | Framework: **Vitest** + **@testing-library/react** + **jsdom**

### Vývojové nástroje

- **Lovable Tagger** – tagovanie komponentov pre Lovable AI
- **Source Maps** – povolené aj v produkčnom builde (pre debugging)
- **HMR** – Hot Module Replacement v dev móde (overlay vypnutý)

### Vendor code splitting

| Chunk | Obsah |
|-------|-------|
| `vendor-react` | React, ReactDOM, React Router |
| `vendor-supabase` | @supabase/supabase-js |
| `vendor-query` | @tanstack/react-query |
| `vendor-ui` | Sonner, Recharts, Lucide React |

---

## Changelog

Kompletná história zmien v [CHANGELOG.md](CHANGELOG.md).

**Posledná verzia – `checkpoint/e2e-rls-claim-stable` (2026-02-19):**
- Opravený onboarding gating (`businesses.onboarding_completed`)
- Pridaný employee self-service view (`/admin/my`)
- Claim flow pre neprihlásených zákazníkov
- RLS politiky pre izoláciu zamestnancov
- Soft-delete pre services/employees (zachovanie FK integrity)

---

## Licencia

Proprietary – © EB-EU s.r.o. Všetky práva vyhradené.

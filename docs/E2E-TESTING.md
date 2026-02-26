# E2E a release gate – Nimble Agenda (booking systém)

Jedna pravda pre testy, release gate poradie, E2E pravidlá a minimálna `data-testid` matica. Projekt nemá e‑commerce (žiadny cart/orders API); backend je **Supabase + Edge Functions**.

---

## 1) Release gate: odporúčané poradie v CI

Fail-fast, rýchle kroky first:

| Krok | Príkaz | Stav v projekte |
|------|--------|------------------|
| 1 | `lint` | ✅ CI |
| 2 | `typecheck` | ✅ CI |
| 3 | `test` (unit) | ✅ CI |
| 4 | `test:coverage` (unit + report, thresholds 0) | ✅ CI |
| 5 | `lockin:check` (Node verzia z `engines`) | ✅ CI |
| 6 | `build` | ✅ CI |
| 7 | `budget` (veľkosť `dist/`, default 12 MB) | ✅ CI (po build) |
| 8 | `test:responsive` (Playwright proti preview) | ✅ CI (job E2E) |
| 9 | `lhci` (Lighthouse nad preview) | ⏳ voliteľné |

**Poznámka:** Backend nie je vlastný REST API server; „API realita“ je Supabase client + Edge Functions (create-public-booking, sync-push, sync-pull, webauthn, …). Integration testy proti Supabase môžu byť mockované alebo proti test projektu.

---

## 2) E2E stabilita: 4 pravidlá (žiadne flaky)

1. **Žiadne selektory na text pre core flow** – len `data-testid`. Text môže zostať pre jednoduché „smoke“ (napr. jedna stránka naozaj načítala titulok).
2. **Po akcii:** radšej `await expect(locator).toBeVisible()` na cieľový element; `waitForLoadState('networkidle')` iba keď naozaj potrebuješ (napr. lazy chunk).
3. **Každý test má vlastné seeded východisko** – nezdielať stav (izolované dáta / demo business).
4. **CI:** `retries: 2`, `trace: 'on-first-retry'`, `video: 'retain-on-failure'` – v Playwright config už máme retries a trace; video je `retain-on-failure`.

---

## 3) „API realita“ v tomto projekte

- **Nie je** `/api/products`, `/api/cart`, `/api/orders` – to bolo z odporúčaní pre e‑commerce.
- **Je:** Supabase (`supabase.from(...)`, RPC), Edge Functions:
  - `create-public-booking` – verejná rezervácia (bez auth)
  - `claim-booking` – priradenie rezervácie k účtu
  - `sync-push` / `sync-pull` – offline sync
  - `send-booking-email`, webauthn, …
- **Auth:** Supabase Auth (session + JWT). Po prihlásení klient posiela **Bearer token** v hlavičkách pri volaniach Supabase. Nie je to klasický „cookie session“ na vlastnom API – Supabase drží session a klient posiela JWT.
- **Verejná rezervácia** nevyžaduje auth. „Order“ = vytvorenie rezervácie cez Edge Function `create-public-booking` (unauthenticated).

---

## 4) data-testid – minimum viable matrix (booking app)

Namiesto product/cart/checkout tu máme booking / auth / reception / admin. Minimálny set je **implementovaný** v kóde (BookingPage, Auth, ReceptionPage, AdminLayout, DashboardPage, Sonner). E2E môže ísť len po `[data-testid="..."]`.

### Globál

- `header-lang-switch` (ak bude)
- `toast` (ak máte toast kontajner)

### Booking flow (`/booking`)

- `booking-page`
- `booking-step-category` (výber kategórie/služby)
- `booking-step-employee` (výber zamestnanca)
- `booking-step-slot` (výber termínu)
- `booking-step-details` (meno, email, poznámka)
- `booking-submit`
- `booking-success` / `booking-error`

### Auth (`/auth`)

- `auth-page`
- `auth-email-input`
- `auth-submit` / `auth-login-btn`
- `auth-redirect` (voliteľne)

### Reception (`/reception`)

- `reception-page`
- `reception-quick-book` (voliteľne)

### Admin

- `admin-layout` / `admin-sidebar`
- `admin-dashboard`
- `admin-calendar`
- `admin-login-redirect` (voliteľne)

Keď toto bude v komponentoch, Playwright môže ísť len po `data-testid` a nebude závisieť na textoch ani CSS.

---

## 5) Windows bez Bash

Release gate a lock-in check majú bežať cross-platform (Node, nie bash). Node verzia lock-in (napr. v CI alebo v skripte) je správny smer – žiadna závislosť na WSL.

---

## 6) Truth switch (sekcia „jedna pravda“ pre generátor testov)

Tri riadky, ktoré určujú správanie testov:

| Otázka | Odpoveď v tomto projekte |
|--------|--------------------------|
| **Auth mode** | Supabase session; klient posiela **Bearer JWT** v hlavičkách pri volaniach Supabase. Nie HttpOnly cookie na vlastnom API. |
| **Verejná rezervácia** | Bez auth. Vytvorenie rezervácie = Edge Function `create-public-booking` (unauthenticated). |
| **Potvrdenie rezervácie** | Podľa implementácie: buď redirect na „ďakujeme“ stránku, alebo toast + redirect. V testoch očakávať buď `booking-success` alebo konkrétnu route / toast. |

Ak budeš mať one-shot generátor E2E testov, stačí túto tabuľku mať ako vstup – auth = Bearer (Supabase), verejná rezervácia = bez auth, potvrdenie = podľa UI (route alebo toast).

---

## Súvisiace súbory

- `e2e/playwright.config.ts` – base URL, retries, trace, video (retain-on-failure)
- `e2e/responsiveness.spec.ts` – responzívne testy (postupne migrovať na data-testid)
- `scripts/budget-check.mjs` – kontrola veľkosti `dist/` (env `BUDGET_MAX_MB`, default 12)
- `scripts/lockin-check.mjs` – kontrola Node verzie podľa `engines.node`
- `.github/workflows/ci.yml` – lint, typecheck, test, test:coverage, lockin:check, build, budget, job E2E (Playwright proti preview)

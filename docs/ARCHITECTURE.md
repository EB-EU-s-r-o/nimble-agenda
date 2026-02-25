# Technická architektúra – PAPI HAIR DESIGN Booking System

## Obsah

- [Technologický stack](#technologický-stack)
- [Routing a stránky](#routing-a-stránky)
- [Autentifikácia a autorizácia](#autentifikácia-a-autorizácia)
- [Správa stavu](#správa-stavu)
- [Databázová schéma](#databázová-schéma)
- [Edge Functions](#edge-functions)
- [Availability engine](#availability-engine)
- [Offline systém](#offline-systém)
- [PWA konfigurácia](#pwa-konfigurácia)
- [Bezpečnosť (RLS)](#bezpečnosť-rls)
- [Kľúčové súbory](#kľúčové-súbory)

---

## Technologický stack

### Frontend
| Knižnica | Verzia | Účel |
|----------|--------|------|
| React | 18.3 | UI framework |
| TypeScript | 5.8 | Typová bezpečnosť |
| Vite + SWC | 5.4 | Build nástroj (rýchla kompilácia) |
| React Router | 6.30 | Client-side routing |
| TailwindCSS | 3.4 | Utility-first CSS |
| shadcn/ui | latest | Komponentová knižnica (70+ komponentov) |
| Framer Motion | 12.34 | Animácie a prechody |
| TanStack Query | 5.83 | Server state caching + fetching |
| Dexie.js | 4.3 | IndexedDB ORM (offline storage) |
| Zod | 3.25 | Schema validácia |
| React Hook Form | 7.61 | Form state management |
| date-fns | 3.6 | Manipulácia s dátumami |
| next-themes | 0.3 | Dark/light mode |

### Backend (Supabase Cloud)
| Komponent | Popis |
|-----------|-------|
| PostgreSQL | Hlavná databáza s RLS |
| Supabase Auth | Autentifikácia (email, OAuth, Passkeys) |
| Edge Functions | 10 Deno serverless functions |
| Supabase Storage | (pripravené, zatiaľ nevyužité) |

### Build & Dev nástroje
| Nástroj | Verzia | Účel |
|---------|--------|------|
| Vitest | 3.2 | Unit testing |
| @testing-library/react | 16 | Komponentové testy |
| ESLint | 9.32 | Code quality |
| vite-plugin-pwa | 1.2 | PWA + Workbox service worker |

---

## Routing a stránky

Routing je definovaný v [src/App.tsx](../src/App.tsx). Všetky stránky sú lazy-loaded cez `React.lazy`.

```
/                    → LiquidPlayground (landing)
/demo                → DemoPage (showcase s expanding cards)
/booking             → BookingPage (verejná rezervácia)
/auth                → Auth (prihlásenie / registrácia)
/offline             → OfflinePage
/install             → InstallPage (PWA sprievodca)
/reception           → ReceptionPage [protected]
/admin               → DashboardPage [protected]
/admin/calendar      → CalendarPage [protected]
/admin/appointments  → AppointmentsPage [protected]
/admin/employees     → EmployeesPage [protected]
/admin/services      → ServicesPage [protected]
/admin/customers     → CustomersPage [protected]
/admin/settings      → SettingsPage [protected]
/admin/my            → MySchedulePage [protected]
```

**Protected routes** sú obalené komponentom `ProtectedRoute` ([src/components/ProtectedRoute.tsx](../src/components/ProtectedRoute.tsx)), ktorý kontroluje `session` z `AuthContext`.

---

## Autentifikácia a autorizácia

### AuthContext

Súbor: [src/contexts/AuthContext.tsx](../src/contexts/AuthContext.tsx)

Poskytuje globálny stav:
```typescript
interface AuthContextType {
  user: User | null           // Supabase auth user
  session: Session | null     // JWT session
  profile: Profile | null     // Profil z tabuľky profiles
  memberships: Membership[]   // Všetky business-role záznamy
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}
```

### Rolový systém

4 roly (priority: owner > admin > employee > customer):

| Rola | Prístup |
|------|---------|
| `owner` | Plný prístup, vrátane správy prevádzky |
| `admin` | Rovnaký ako owner (zatiaľ identický) |
| `employee` | Iba vlastné termíny (`/admin/my`) |
| `customer` | Iba `/booking` a história vlastných rezervácií |

Hook `useBusiness()` ([src/hooks/useBusiness.ts](../src/hooks/useBusiness.ts)) vracia:
- `businessId` – aktívna prevádzka (fallback na demo ID)
- `role` – aktuálna rola
- `isOwnerOrAdmin`, `isEmployee`, `isOwner` – boolean flagy

### Passkeys (WebAuthn)

Hook: [src/hooks/useWebAuthn.ts](../src/hooks/useWebAuthn.ts)

- Registrácia: volá `webauthn-register` edge function
- Autentifikácia: volá `webauthn-authenticate` edge function
- Ukladá credentials do tabuľky `passkeys`
- Používa `navigator.credentials.create/get`

---

## Správa stavu

### Server state → TanStack React Query

Všetky API volania cez Supabase klient sú cachované pomocou React Query. Invalidácia po mutáciách.

### Global state → React Context

- `AuthContext` – autentifikácia, profil, memberships

### Local/offline state → Dexie IndexedDB

- Termíny pre recepciu + sync queue

### Form state → React Hook Form + Zod

- Všetky formuláre (booking, settings, employees, services)

---

## Databázová schéma

### Hlavné vzťahy

```
auth.users (Supabase Auth)
    │
    └──▶ profiles (id = auth.uid())
              │
              └──▶ memberships ──▶ businesses
                        │               │
                        └── role         └──▶ employees ──▶ appointments
                                         └──▶ services  ──▶ appointments
                                         └──▶ customers ──▶ appointments
                                         └──▶ business_hours
                                         └──▶ business_date_overrides
```

### Tabuľka `businesses`

Kľúčové stĺpce:
- `id` uuid PRIMARY KEY
- `name`, `slug`, `address`, `phone`, `email`
- `timezone` (default: `Europe/Bratislava`)
- `lead_time_minutes` – min. čas dopredu (default: 0)
- `max_days_ahead` – max. horizont (default: 30)
- `cancellation_hours` – storno limit
- `onboarding_completed` boolean – či prešla prevádzka onboardingom
- `opening_hours` JSONB – legacy format (nové záznamy používajú `business_hours` tabuľku)

### Tabuľka `appointments`

- `id`, `business_id`, `employee_id`, `service_id`, `customer_id`
- `start_at`, `end_at` (timestamp with timezone)
- `status`: `pending | confirmed | completed | cancelled`
- `customer_name`, `customer_email`, `customer_phone`
- `notes`

### Tabuľka `business_hours`

- `business_id`, `day_of_week` (0=Po ... 6=Ne)
- `open_time`, `close_time` (time)
- `mode`: `open | closed | on_request`

---

## Edge Functions

Umiestnené v `supabase/functions/`. Runtime: Deno. JWT overenie: vypnuté (vlastná logika).

### `create-public-booking`

Vstup: `{ business_id, service_id, employee_id?, start_at, customer_name, customer_email, customer_phone?, notes? }`

Tok:
1. Validácia vstupov (UUID, ISO dátumy, email format)
2. Kontrola konfliktu (existujúce termíny v rovnakom čase)
3. Upsert zákazníka (podľa email/telefónu)
4. Insert do `appointments`
5. Generovanie claim tokenu (30 min platnosť)
6. Volanie `send-booking-email`

### `sync-push`

- Bearer autorizácia (`Authorization` header)
- Dedup cez `sync_dedup` tabuľku (`idempotency_key`)
- Spracovanie akcií: `APPOINTMENT_CREATE | UPDATE | CANCEL`
- Conflict detection → vracia `conflict_suggestion`

### `sync-pull`

- Vracia snapshot appointments za posledných N dní
- Používané recepciou a offline stránkou

### `webauthn-register` / `webauthn-authenticate`

- FIDO2/WebAuthn protokol
- `register`: generuje challenge, ukladá credential do `passkeys`
- `authenticate`: overuje assertion, generuje magic link token pre sign-in

### `claim-booking`

- Overenie Bearer tokenu
- Kontrola platnosti a `used_at` (idempotentné)
- Vytvorenie `customer` membership

### `send-booking-email`

- SMTP credentials v Supabase secrets (nie v kóde)
- HTML e-mail s detailmi rezervácie

### `consent-event`

- Public endpoint pre server-side audit consent zmien
- Validuje `subject_type`, `action`, `categories`, `source`
- Ukladá hash IP (`ip_hash`), nikdy nie raw IP

### `gdpr` (`/gdpr/status`, `/gdpr/export`, `/gdpr/delete`)

- `status`: vracia minimum runtime contract (available actions, mode, request history pre auth user)
- `export`: vytvorí GDPR request a vráti `accepted` (asynchrónny follow-up flow)
- `delete`: vytvorí GDPR request a vráti `pending_review` (bez okamžitého deštruktívneho delete)

---

## Availability engine

Súbor: [src/lib/availability.ts](../src/lib/availability.ts)

Funkcia `generateSlots(input: SlotGeneratorInput): Date[]` generuje dostupné časy rezervácie.

### Faktory

1. **Business hours** – pracovné hodiny podľa dňa týždňa (tabuľka `business_hours` alebo legacy `opening_hours` JSONB)
2. **Date overrides** – výnimky pre konkrétne dátumy
3. **Employee schedule** – individuálne pracovné hodiny zamestnanca
4. **Service duration + buffer** – trvanie služby + buffer čas po termíne
5. **Lead time** – minimálny čas pred rezerváciou
6. **Existing appointments** – konflikt detekcia
7. **Timezone** – všetky výpočty v správnej časovej zóne (default: `Europe/Bratislava`)

### Slot interval

Default: **30 minút**. Konfigurovateľné cez `slotInterval` parameter.

### Timezone utilities

Súbor: [src/lib/timezone.ts](../src/lib/timezone.ts) – bez externých závislostí, čistý `Intl` API.

---

## Offline systém

### IndexedDB schéma (Dexie)

Súbor: [src/lib/offline/db.ts](../src/lib/offline/db.ts)

```typescript
class OfflineDB extends Dexie {
  appointments: Table<OfflineAppointment>   // lokálna kópia
  queue: Table<QueueItem>                   // čakajúce akcie
  meta: Table<{ key: string; value: string }> // metadata (last sync)
}
```

### Sync engine

Súbor: [src/lib/offline/sync.ts](../src/lib/offline/sync.ts)

- Auto-sync každých **30 sekúnd** pri online stave
- PUSH: `queue` → `sync-push` edge function
- PULL: `sync-pull` → aktualizácia `appointments`
- Conflict resolution: server navrhuje alternatívny čas
- Idempotentnosť: `idempotency_key` pri každej akcii

### Queue položky

```typescript
type OfflineAction =
  | { type: "APPOINTMENT_CREATE"; payload: OfflineAppointment; idempotency_key: string }
  | { type: "APPOINTMENT_UPDATE"; payload: Partial<OfflineAppointment> & { id: string } }
  | { type: "APPOINTMENT_CANCEL"; payload: { id: string; reason?: string } }
```

---

## PWA konfigurácia

Definované v [vite.config.ts](../vite.config.ts) pomocou `vite-plugin-pwa`.

### Workbox caching

```
NetworkFirst  → Supabase REST API (TTL: 1h, max 50 entries)
CacheFirst    → statické assety JS/CSS/img (TTL: 30 dní, max 100 entries)
```

### Service worker registrácia

- `registerType: "prompt"` – užívateľ dostane prompt pri novej verzii
- `navigateFallbackDenylist: [/^\/~oauth/]` – OAuth flow obíde SW

### Manifest

```json
{
  "name": "PAPI HAIR DESIGN – Booking",
  "short_name": "PHD Booking",
  "start_url": "/booking",
  "display": "standalone",
  "background_color": "#0b0b0b",
  "theme_color": "#0b0b0b"
}
```

---

## Bezpečnosť (RLS)

### Princíp

Každá tabuľka má `ROW LEVEL SECURITY` politiky. Frontend nikdy nemusí filtrovať podľa `business_id` – databáza to robí automaticky.

### Pomocné funkcie

```sql
-- Či je user admin/owner prevádzky
CREATE FUNCTION is_business_admin(user_id uuid, business_id uuid) RETURNS boolean

-- Či je user zamestnanec prevádzky
CREATE FUNCTION is_business_employee(user_id uuid, business_id uuid) RETURNS boolean

-- Vráti employee.id pre user v prevádzke
CREATE FUNCTION get_employee_id(user_id uuid, business_id uuid) RETURNS uuid
```

### Príklady RLS politík

```sql
-- Zamestnanci vidia iba vlastné termíny
CREATE POLICY appointments_select_employee_own ON appointments
  FOR SELECT USING (
    employee_id = get_employee_id(auth.uid(), business_id)
  );

-- Admini vidia všetky termíny svojej prevádzky
CREATE POLICY appointments_select_admin ON appointments
  FOR SELECT USING (
    is_business_admin(auth.uid(), business_id)
  );
```

### Multi-tenant izolácia

Každý `business_id` je izolovaný – admin jednej prevádzky nemôže vidieť dáta inej prevádzky.

---

## Kľúčové súbory

| Súbor | Popis |
|-------|-------|
| [src/App.tsx](../src/App.tsx) | Routing, providery, lazy loading |
| [src/contexts/AuthContext.tsx](../src/contexts/AuthContext.tsx) | Globálny auth stav |
| [src/hooks/useBusiness.ts](../src/hooks/useBusiness.ts) | Aktívna prevádzka + rola |
| [src/hooks/useBusinessInfo.ts](../src/hooks/useBusinessInfo.ts) | Verejné info o prevádzke (3 RPCs) |
| [src/lib/availability.ts](../src/lib/availability.ts) | Generátor dostupných slotov |
| [src/lib/timezone.ts](../src/lib/timezone.ts) | Timezone utility (Intl API) |
| [src/lib/offline/db.ts](../src/lib/offline/db.ts) | Dexie IndexedDB schéma |
| [src/lib/offline/sync.ts](../src/lib/offline/sync.ts) | Offline sync engine |
| [src/integrations/supabase/client.ts](../src/integrations/supabase/client.ts) | Supabase klient |
| [src/integrations/supabase/types.ts](../src/integrations/supabase/types.ts) | Auto-generované DB typy |
| [vite.config.ts](../vite.config.ts) | Vite + PWA konfigurácia |
| [supabase/config.toml](../supabase/config.toml) | Supabase projekt konfigurácia |
| [supabase/functions/](../supabase/functions/) | Edge Functions |
| [supabase/migrations/](../supabase/migrations/) | SQL migrácie |
| [docs/seed-demo.sql](seed-demo.sql) | Demo seed dáta |

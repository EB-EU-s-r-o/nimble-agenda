# Audit testov – stav k 26. 2. 2026

## Súhrn

| Kategória        | Stav |
|------------------|------|
| **Unit testy**   | Vitest, 17 súborov, **74 testov** – všetky prechádzajú |
| **Coverage**     | V8, thresholds 0 % (žiadne minimá) |
| **E2E**          | Playwright – responsiveness (viewporty, overflow, kritické elementy) |
| **CI**           | Lint, typecheck, test, build, budget, test:responsive |

---

## Čo je otestované (unit)

### `src/lib/`
| Súbor | Testy | Poznámka |
|-------|-------|----------|
| `utils.ts` | 6 | formatDuration, parseTime, atď. |
| `timezone.ts` | 7 | getTimeInTZ, timezone label |
| `availability.ts` | 12 | sloty, overlap, isWithinBusinessHours |
| `tenantResolver.ts` | 4 | business_id z URL, payload |
| `indexed-db-available.ts` | 4 | storage + SW kontrola |
| `diagnosticsHelpers.ts` | 12 | diagnostické stringy, formátovanie |
| **bez testov** | – | `calendar-utils.ts`, `priceListOrder.ts`, `providerSelection.ts`, `recaptcha.ts`, `supabase.ts`, `useWindowManager.ts`, `offline/*` |

### `src/hooks/`
| Súbor | Testy | Poznámka |
|-------|-------|----------|
| `useBusiness.ts` | 4 | businessId, role, activeMembership |
| **bez testov** | – | `useBusinessInfo.ts`, `useOnboarding.ts`, `useWebAuthn.ts` |

### `src/components/`
| Súbor | Testy | Poznámka |
|-------|-------|----------|
| `NavLink.test.tsx` | 2 | render linku, active |
| `ProtectedRoute.test.tsx` | 4 | redirect neprihlásených, render children |
| `calendar/mobile/EmployeeColumn.test.tsx` | 1 | render |
| `calendar/mobile/blocking.test.ts` | 3 | logika blokovania |
| `calendar/mobile/schedule.test.ts` | 2 | schedule utils |
| `calendar/mobile/slotGuards.test.ts` | 2 | slot guard logika |
| **bez testov** | – | AdminLayout, CookieConsent, LiquidWindow, LogoIcon, OfflineBanner, OnboardingWizard, ThemeToggle, booking/*, calendar/* (ostatné), ui/* |

### `src/pages/`
| Súbor | Testy | Poznámka |
|-------|-------|----------|
| `NotFound.test.tsx` | 3 | 404 heading, link späť |
| `OfflinePage.test.tsx` | 3 | „Si offline“, link |
| **bez testov** | – | Index, BookingPage, Auth, DemoPage, ReceptionPage, InstallPage, DiagnosticsPage, LiquidPlayground, PrivacyPage, TermsPage, admin/* (všetky) |

### `src/test/`
| Súbor | Testy | Poznámka |
|-------|-------|----------|
| `calendarEventUtils.test.ts` | 4 | event utils pre kalendár |
| `example.test.ts` | 1 | placeholder |

---

## E2E (Playwright)

- **Súbor:** `e2e/responsiveness.spec.ts`
- **Čo robí:** Pre zoznam viewportov a stránok (/, /booking, /auth, /demo) kontroluje:
  - HTTP 200,
  - žiadny horizontálny overflow,
  - kritický element (napr. „Vyberte kategóriu“, „Prihlásenie“) je viditeľný.
- **Spustenie:** `npm run test:responsive` (alebo `test:responsive:preview` s buildom).

---

## Čo chýba (prioritný náhľad)

1. **Kritické stránky bez unit testov:** BookingPage, Auth, ReceptionPage, admin stránky – aspoň smoke (render, hlavné elementy) by znížil regresie.
2. **Lib bez testov:** `calendar-utils.ts`, `offline/sync.ts`, `offline/db.ts` – dôležité pre offline a kalendár.
3. **Hooks:** `useBusinessInfo`, `useOnboarding`, `useWebAuthn` – len useBusiness má testy.
4. **Komponenty:** CookieConsent, QuickBookingSheet, AppointmentDetailSheet, kalendárové komponenty – žiadne unit testy.
5. **Coverage thresholds:** Sú na 0 %; ak chceš minimálnu mieru pokrytia, treba v `vitest.config.ts` nastaviť `lines/functions/branches/statements` na napr. 50.

---

## Príkazy

```bash
npm run test              # unit – vitest run
npm run test:watch        # unit – watch mode
npm run test:coverage     # unit + lcov report
npm run test:responsive   # Playwright responsiveness
```

Log path pre tento audit: výstup `npm run test` (17 súborov, 74 testov, exit 0).

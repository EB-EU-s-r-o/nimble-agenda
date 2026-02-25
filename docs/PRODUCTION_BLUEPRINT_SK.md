# Kompletný blueprint: oprava Booking systému a spustenie do prevádzky

Dátum: 2026-02-25  
Jazyk: SK  
Cieľ: dostať systém z aktuálneho stavu na **bezpečný produkčný go-live** pre 10k+ používateľov.

---

## 1) Executive plán (čo ideme urobiť)

### Stav dnes
- Produkcia nie je pripravená (riziká: bezpečnosť, double-booking, compliance, observability).

### Cieľový stav (Definition of Done)
- Žiadne známe kritické bezpečnostné nálezy (P0/P1).
- Žiadne double-bookingy pri paralelnom strese.
- Auditovateľné GDPR procesy (consent, export, delete).
- Monitoring + alerting + on-call runbook funkčný.
- Canary deploy + rollback overené.

### Časový rámec
- **D0–D1 (24h):** hotfix bezpečnosť + booking integrita.
- **D2–D5:** stabilizácia, telemetry, payment/revenue hardening.
- **D6–D7:** UAT, load test, go-live window.

---

## 2) Riadenie práce: tímy, roly, rituály

### RACI (minimum)
- **CTO/Tech lead:** architektúra, go/no-go rozhodnutie.
- **Backend lead:** DB constraints, edge functions, auth/cors.
- **Frontend lead:** booking flow, consent UX, idempotency klient.
- **DevOps/SRE:** CI/CD, observability, rollback drill.
- **Legal/Compliance:** GDPR texty, DSAR procesy, log retention.
- **Product/Revenue owner:** funnel metriky, no-show/deposit politika.

### Denný rytmus
- 09:00 war-room standup (15 min)
- 14:00 checkpoint (blokery)
- 18:00 release readiness review

---

## 3) Fáza A (D0–D1): kritické hotfixy pred akýmkoľvek trafficom

## A1. Zablokovať PII únik (P0)

### Kroky
1. Odstrániť verejnú policy `appointments_select_public`.
2. Nahradiť ju bezpečným RPC pre availability (vracia iba sloty/aggregate, nie PII).
3. Reauditovať RLS na `appointments`, `customers`, `booking_claims`.

### SQL návrh
```sql
DROP POLICY IF EXISTS "appointments_select_public" ON public.appointments;

-- Príklad: publikovateľná dostupnosť iba cez security definer RPC
-- RPC musí vracať iba neosobné údaje (časové sloty), nie customer fields.
```

### Akceptačné kritérium
- Anonymný klient nedokáže cez REST/API čítať appointments s customer väzbami.

---

## A2. Eliminovať double-booking (P0)

### Kroky
1. Zaviesť DB-level overlap guard (exclusion constraint).
2. V booking funkcii použiť idempotency key.
3. Pri create-booking fallback na `409 Conflict` s odporúčaným najbližším slotom.

### SQL návrh
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.appointments
ADD CONSTRAINT no_overlapping_employee_slots
EXCLUDE USING gist (
  employee_id WITH =,
  tstzrange(start_at, end_at, '[)') WITH &&
)
WHERE (status <> 'cancelled');
```

### Akceptačné kritérium
- Paralelný test 100 súbežných rezervácií na rovnaký slot → max 1 successful insert.

---

## A3. Sprísniť Edge Function perimeter (P0)

### Kroky
1. `verify_jwt=true` default pre funkcie, ktoré nie sú verejné.
2. Verejné endpointy: strict input schema + rate limit + origin allowlist.
3. CORS `*` nahradiť explicitným allowlistom domén.

### Akceptačné kritérium
- Bez JWT sa privátne funkcie nedajú volať.
- Neznámy origin dostane 403.

---

## A4. Vypnúť slabú diagnostiku v produkcii (P1)

### Kroky
1. Zrušiť `?key=diagnostics` mechanizmus.
2. Diagnostics page dostupná iba pre admin session + server flag.
3. Žiadne detailné infra hlášky pre verejnosť.

---

## A5. Consent + GDPR audit trail (P1)

### Kroky
1. Pridať tabuľku `consent_events` (kto, čo, kedy, verzia textu).
2. Pri booking submit ukladať accepted terms/privacy/cookie choices server-side.
3. Verzionovať texty podmienok (napr. `terms_version=2026-02-25`).

### SQL návrh
```sql
CREATE TABLE IF NOT EXISTS public.consent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_email text,
  subject_profile_id uuid,
  consent_type text NOT NULL, -- terms|privacy|analytics|marketing
  consent_value boolean NOT NULL,
  policy_version text NOT NULL,
  source text NOT NULL DEFAULT 'booking_web',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 4) Fáza B (D2–D5): stabilizácia systému

## B1. Multi-tenant korektnosť

### Kroky
1. Odstrániť hardcoded `DEMO_BUSINESS_ID` z booking toku.
2. Resolve business podľa `host/slugu`.
3. Pridať fallback 404, keď business neexistuje.

### Akceptačné kritérium
- Jedna build artefakt obsluhuje viac business domén bez ručnej zmeny ID.

---

## B2. CI/CD a release gates

### Minimum pipeline
- `npm ci`
- `npm run lint`
- `npm test`
- `npm run build`
- smoke e2e (booking happy path)

### Release policy
- Žiadny merge bez zeleného pipeline.
- Hotfix branch + tagged release (`vX.Y.Z`).

---

## B3. Observability (musí byť hotové pred go-live)

### Zaviesť
- **Sentry**: FE + Edge Functions.
- **Product analytics**: funnel events (step_1_service → step_5_confirm).
- **Business alerts**: spike 4xx/5xx, drop conversion, failed booking ratio.

### Kľúčové eventy
- `booking_step_viewed`
- `booking_slot_selected`
- `booking_submit_clicked`
- `booking_success`
- `booking_conflict_409`
- `booking_failed`

---

## B4. Výkon (mobile-first)

### Kroky
1. Optimalizovať veľké assety (`logo-icon.webp`), zaviesť responsive variants.
2. Pre booking flow lazy-load sekundárnych komponentov.
3. API caching pre availability (krátke TTL, napr. 15–30 s).

### SLO ciele
- Booking page LCP < 2.5 s (4G).
- Availability API p95 < 300 ms.
- Booking submit p95 < 700 ms.

---

## B5. Bezpečnostné testy

### Minimálny test balík
- RLS bypass testy.
- Replay test booking requestu (idempotency).
- JWT tampering test.
- CORS negative tests.

---

## 5) Fáza C (D6–D7): UAT, load, cutover

## C1. UAT scenáre (must pass)
- Public booking (nový zákazník / existujúci zákazník).
- Cancel/reschedule flows.
- Offline recepcia sync conflict.
- Safari iOS + Android Chrome.
- Accessibility: keyboard-only booking.

## C2. Load test
- 10k users/day profil.
- Peak: 50–100 concurrent booking submissions.
- Kritérium: 0 double-booking, error rate < 1%.

## C3. Cutover runbook
1. Freeze deploy (2h pred go-live).
2. DB backup snapshot + migration checksum.
3. Deploy canary 10% traffic (30 min).
4. Ak metriky OK → 100% traffic.
5. War room active min. 24h.

## C4. Rollback runbook
- Trigger: p95 latencia > 2x baseline, error > 2%, booking success < 95%.
- Kroky: reroute na predchádzajúci release + rollback feature flags + DB rollback script (ak je kompatibilné).

---

## 6) Detailný backlog podľa priority

## P0 (blokuje go-live)
1. Remove public appointments policy.
2. Add exclusion constraint + test race.
3. Enforce JWT/CORS tightening.
4. Introduce booking idempotency key.

## P1 (musí byť hotové v 1. týždni)
1. Consent audit trail.
2. Diagnostics hardening.
3. Multi-tenant business resolution.
4. Sentry + funnel analytics + alerts.

## P2 (optimalizácia po go-live)
1. Deposit/dunning/upsell flows.
2. Advanced caching + prefetch.
3. A/B pricing tests.

---

## 7) KPI dashboard (čo musíš sledovať denne)

### Technické KPI
- Booking API success rate (target > 99%).
- Conflict rate 409 (target < 3%, sledovať trend).
- p95 latency availability/booking endpoints.
- FE JS errors/session.

### Biznis KPI
- Funnel conversion step-by-step.
- No-show rate.
- Cancellation rate <24h.
- Repeat customer ratio.
- Revenue per booked slot.

### Security/Compliance KPI
- Unauthorized access attempts.
- DSAR SLA (export/delete vybavenie v termíne).
- Consent logging coverage (target 100%).

---

## 8) GDPR blueprint (prakticky)

## DSAR API minimum
- `POST /api/gdpr/export` (auth + ownership check)
- `POST /api/gdpr/delete` (soft-delete queue + retention policy)
- `GET /api/gdpr/status/:request_id`

## Prevádzkové pravidlá
- Export max do 30 dní.
- Delete flow auditovaný, reverzibilný len v retention okne.
- Všetky consent zmeny verziované.

---

## 9) Finančný blueprint (revenue hardening)

## Rýchle wins (2–4 týždne)
1. 30–50% deposit pri rezervácii (anti no-show).
2. Failed payment recovery (smart retries + reminder sequence).
3. 1-click upsell (doplnkové služby pri checkoute).
4. Waitlist auto-fill pri zrušení slotu.

## Očakávaný dopad (orientačne)
- No-show zníženie: -20% až -40%.
- Booking completion +5% až +15%.
- ARPU +8% až +20% cez upsell.

---

## 10) Go/No-Go checklist (posledné rozhodnutie)

### GO iba ak všetko TRUE
- [ ] P0 a P1 tasky sú DONE.
- [ ] Load test prešiel.
- [ ] Security retest bez kritických nálezov.
- [ ] Monitoring + alerting + on-call funguje.
- [ ] Rollback drill bol vykonaný úspešne.
- [ ] Legal/compliance odobrenie podpísané.

Ak niektorá položka nie je TRUE → **NO-GO**.

---

## 11) Odporúčaný harmonogram nasadenia

- **Pondelok:** P0 fixy + migration deploy na staging.
- **Utorok:** race/security testy + consent logging.
- **Streda:** multi-tenant fix + observability complete.
- **Štvrtok:** load test + UAT + bugfix.
- **Piatok:** canary + controlled go-live.

---

## 12) Komunikačný plán počas go-live

### Interné kanály
- `#war-room-booking`
- `#incidents`
- `#release-notes`

### Incident severity
- **SEV1:** booking stop/revenue stop → okamžitý rollback.
- **SEV2:** degradácia výkonu/funkcie → fix do 2h.
- **SEV3:** minor UX issue → plánovaný fix.

---

## 13) Prvé kroky hneď teraz (ak chceš štart dnes)

1. Vytvoriť hotfix branch `hotfix/go-live-p0`.
2. Odstrániť public appointments policy.
3. Pridať exclusion constraint + race test.
4. Zavrieť diagnostics endpoint pre verejnosť.
5. Zapnúť basic Sentry + alert na booking fail spike.

Po týchto 5 bodoch máš základ, na ktorom sa dá bezpečne stavať.

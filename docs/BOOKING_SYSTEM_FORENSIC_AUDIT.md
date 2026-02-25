# Booking System Forensic Audit (Go-Live Readiness)

Date: 2026-02-25  
Scope: architecture, code, DB, API, DevOps, security, performance, UX, business logic, edge cases, revenue, compliance, mobile/PWA, accessibility, monitoring.

## 0) Required context check (MANDATORY)

### Provided
- `package.json` present.
- DB schema/migrations present (`supabase/migrations/*`).
- API surface discoverable via Supabase Edge Functions + frontend invokes.

### Missing (critical for full financial/legal certainty)
- `composer.json` / `firebase.json` (not present in repo).
- Error logs (last 30 days) – missing.
- Current MRR/churn/no-show/funnel data – missing.
- Stripe/PayPal configuration and webhook history – missing from current codebase.
- Booking-flow screenshots from production telemetry – missing.

**Impact of missing context:** revenue and legal risk quantification below is directional, not accounting-grade.

---

## Executive command center (one-page truth)

**🚦 PRODUCTION READY:** ❌ **NO** (security + booking integrity blockers)

### Top 5 blockers (fix first)
1. **PII exposure risk**: public appointments read policy (`USING (true)`) allows anonymous reads against `appointments` if API keys leak/abuse routes.
2. **Double-booking race window**: slot check and insert are separate operations in edge function, no DB exclusion constraint or transactional lock.
3. **Hard-coded demo business routing**: public booking is pinned to one UUID in UI, breaking multi-tenant correctness and enabling wrong-salon bookings.
4. **Weak diagnostics gate**: static `?key=diagnostics` opens infra/debug clues in production route.
5. **Compliance gap**: no implemented GDPR DSAR/export/delete API, consent is stored only in localStorage and not server-auditable.

### Top 5 strengths (keep)
1. React lazy loading and route splitting are in place.
2. RLS architecture exists and role model is documented.
3. Offline queue/idempotency model exists (`sync_dedup`).
4. Public booking input validation has basic schema checks and throttling.
5. Test/lint/build are green in current branch.

### 24h quick wins
- Drop `appointments_select_public` and replace with minimal availability RPC.
- Add DB-level overlap protection (exclusion constraint on employee + tstzrange).
- Resolve business by slug/domain, remove hardcoded demo UUID.
- Restrict diagnostics route to authenticated admins + signed server flag.
- Add server-side consent log table and write path.

---

## 1) Architecture (scalability & tenancy)

### Findings
- **Single-tenant hard bind in booking UX**: `DEMO_BUSINESS_ID` is hardcoded in booking flow queries and booking submission body.
- **Likely shared DB bottleneck over time**: no partitioning strategy and no anti-overlap DB constraints for appointments in schema.
- **Role guard naming mismatch**: `requireAdmin` also admits `employee`, increasing policy confusion risk.

### Risk
- 3k→30k users: ⚠️ conditional only after DB concurrency hardening + multi-tenant routing fix.

### Fix snippet
```ts
// Replace constant ID with runtime source (slug/domain/route param)
const businessId = await resolveBusinessIdFromHostOrSlug();
```

---

## 2) Code surgery (crashers/logic bugs)

### High-priority
1. **Booking conflict race**: `select conflicts` then `insert appointment` in separate calls.
2. **No request idempotency key for public booking**: retries can create duplicates under flaky networks.
3. **Unsafe `any` RPC calls in booking/admin flows** reduce compile-time guarantees.
4. **Potential stale UI state** in booking flow when dependencies change (e.g., employee/service/date switching complexity).

### Fix snippet
```sql
-- DB guard (authoritative)
ALTER TABLE appointments
ADD CONSTRAINT no_overlapping_employee_slots
EXCLUDE USING gist (
  employee_id WITH =,
  tstzrange(start_at, end_at, '[)') WITH &&
) WHERE (status <> 'cancelled');
```

---

## 3) Database dissection

### Findings
- `appointments` has only simple btree indexes (business/employee/customer/start/status), no overlap constraint.
- Public select policy on appointments is explicitly permissive.

### DB risk
🔥 **HIGH** (integrity + privacy).

### Fixes
- Add exclusion constraint above.
- Replace public table policy with narrowly scoped RPC returning only slots.
- Add composite index for common calendar scans:
```sql
CREATE INDEX idx_appointments_business_employee_start
ON appointments(business_id, employee_id, start_at)
WHERE status <> 'cancelled';
```

---

## 4) API forensics

### Endpoint map (observed)
- `create-public-booking`, `claim-booking`, `sync-push`, `sync-pull`, `webauthn-register`, `webauthn-authenticate`, `save-smtp-config`, `send-booking-email`, `seed-demo-accounts`.

### Findings
- `verify_jwt = false` globally for all listed functions in `config.toml`; some functions self-verify, but this increases accidental exposure blast radius.
- CORS is wildcard (`*`) in multiple functions.
- Diagnostics reveals expected project ref and env mismatch hints.

### Fix
- Set `verify_jwt=true` by default; explicitly opt-out only for intentionally public function(s).
- Tighten CORS to known origins.

---

## 5) Security (pentest posture)

### Critical
- **Potential PII leakage path:** permissive appointments policy + broad client capabilities.
- **Public diagnostics entry key** is predictable/static.
- **Service-role functions do privileged writes**; if auth verification logic regresses, blast radius is full DB.

### Immediate hardening
```ts
const ALLOWED_ORIGINS = new Set(["https://booking.papihairdesign.sk"]);
if (!ALLOWED_ORIGINS.has(req.headers.get("origin") ?? "")) return 403;
```

---

## 6) Performance xray

### Measured (local build)
- Build time ~18.5s.
- Main app chunk `index-Us6lMDDr.js` ~329kB (100kB gzip).
- Supabase/vendor chunks sizable (`~174kB`, `~229kB`).
- One image asset nearly 1MB (`logo-icon.webp`).

### Risk
- Mobile first paint/TTI likely degraded on slow networks.

### Wins
- Keep route-level lazy loading.
- Optimize/resize logo and long-tail assets.

---

## 7) UI/UX anomaly detector

### Findings
- Booking flow is long single-component implementation, increasing regressions.
- Terms checkbox is enforced, but consent proof is not persisted server-side.
- No visible cancellation policy/protection/deposit UX in booking submit path.

### Revenue impact (directional)
- Trust friction + hidden policy ambiguity commonly causes step-drop in checkout funnels.

---

## 8) Business logic surgery (money leaks)

### Likely leaks from code
- No deposit/preauth in public booking path.
- No waitlist/overbooking mitigation path.
- No automated no-show penalty flow visible.

### Priority
- Add deposits + cancellation window enforcement in backend transaction.

---

## 9) DevOps war room

### Findings
- No CI workflow files present in repo (`.github/workflows` absent).
- Observability integrations are minimal from code perspective (SpeedInsights present; no Sentry/PostHog wiring found).

### Risk
- Incident detection and rollback confidence low for go-live at 10k users.

---

## 10) Edge-case stress test

### Gaps observed
- Timezone math relies on client generation + server checks but no DB overlap lock.
- Offline sync may conflict under concurrent receptionist/admin edits despite dedup.
- No explicit browser-back/duplicate-submit hard idempotency for public checkout.

---

## 11) Revenue forensics

### Missing business telemetry
- No MRR/churn/failed payment metrics in repo.
- Cannot validate dunning, retries, upsell funnels from current code.

### Directional uplift
- Implement retries + deposits + upsell widgets can materially improve realized revenue.

---

## 12) Legal / GDPR

### Findings
- Privacy/Terms pages are present.
- No visible DSAR endpoints for export/delete.
- Cookie preferences live in localStorage; no auditable consent log persisted server-side.

### Compliance risk
🟠 **HIGH** for auditability obligations.

---

## 13) Mobile / PWA

### Findings
- PWA manifest/icons/service worker are configured.
- Heavy JS + large images likely hurt low-end mobile performance.

### Score
B- foundation, but performance optimization needed.

---

## 14) Accessibility

### Findings
- No automated a11y tests observed in test suite.
- Cookie dialog has ARIA labels but unknown focus trap/keyboard cycle guarantees.
- Large custom booking UI needs keyboard/screen-reader walkthrough testing.

### Score
Estimated 70/100 pending automated + manual audit.

---

## 15) Monitoring blindspots

### Findings
- No explicit funnel event taxonomy in repo.
- No booking abandonment event instrumentation observed.

### Fix stack
- Add PostHog/GA4 funnel events + Sentry traces + revenue alerting.

---

## Deploy-under-my-name decision

**Deploy tomorrow under my name?** ❌ **NO**.

**Why exactly:**
1. Privacy/security blocker in appointment data exposure model.
2. Booking integrity blocker (race condition without DB exclusion lock).
3. Missing legal/financial observability evidence (MRR/churn/logs absent).

---

## Suggested pricing & upside (directional)

- **Max price to charge today (current state):** €69–€99/month SMB tier.
- **After hardening + revenue stack:** €149–€249/month.
- **MRR potential:** 2.0x–3.0x from reduced no-shows + conversion + recoveries (requires real funnel/payment data to validate).

---

## Action roadmap

### Next 24 hours
1. Remove public appointments select policy.
2. Add DB exclusion constraint for overlap.
3. Introduce idempotency key in public booking create.
4. Lock diagnostics route.
5. Persist consent acceptance server-side.

### Week 1
1. CI pipeline with lint/test/build + preview deploy gates.
2. Sentry + product analytics funnels + alerting.
3. Deposit/cancellation backend policy enforcement.
4. Multi-tenant business resolution by host/slug.


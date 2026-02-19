Build a complete multi-tenant booking system from this blank Lovable starter using Supabase Free + shadcn/ui + Tailwind (Slovak UI only). Minimal iterations: implement end-to-end in one coherent pass with clean architecture.

TECH

- Supabase Free (Postgres) + RLS

- Auth: Email/Password + Google OAuth

- Calendar: react-big-calendar with Month/Week/Day

- Validation: Zod, toasts: sonner

DATA MODEL (must be multi-tenant)

- businesses, profiles (auth.users), user_roles, memberships(business_id, profile_id, role)

- services(business_id, name_sk, duration, price?, buffer?)

- employees(business_id, profile_id, display_name), schedules(employee_id, day_of_week, start_time, end_time)

- customers(business_id, profile_id nullable, full_name, email unique per business, phone?)

- appointments(business_id, customer_id, employee_id, service_id, start_at, end_at, status)

- onboarding_answers(business_id, step, data)

- booking_claims(business_id, appointment_id, email, token_hash, expires_at, used_at) for “claim account”

RLS: owner/admin -> all in business; employee -> only own appointments; customer -> only own bookings once linked.

PUBLIC BOOKING (no login) + PREFILLED REGISTRATION (required)

- Public booking page (mobile-first): service → employee or “Prvý voľný” → date → available time → contact → confirm.

- Create booking via Supabase Edge Function (service role) to bypass RLS safely:

  - validate availability, create/attach customer, create appointment, generate one-time claim token (30 min), store hashed token in booking_claims, return token once.

- After booking show CTA “Dokonči registráciu” with prefilled form (email, meno, tel); user only sets password (or Google).

- After auth success call Edge Function claimBooking(token) to link customers.profile_id = auth.uid() and mark used_at.

AVAILABILITY ENGINE (must exist)

Create a slot generator that returns available slots respecting:

- business opening hours, employee schedules, service duration + buffer, lead time, max days ahead, timezone, existing appointments.

Prevent double booking in UI + DB (use Postgres constraint/exclusion strategy if possible).

ADMIN + EMPLOYEE DASHBOARD

- Routing: /booking (public), /auth, /admin/*

- Admin sidebar (SK): Prehľad, Kalendár, Rezervácie, Zamestnanci, Služby, Zákazníci, Nastavenia.

- Employee sees only own Kalendár + Rezervácie.

CALENDAR (core)

- Big react-big-calendar Month/Week/Day with “Dnes” + navigation.

- Click empty slot -> modal: service + employee + available times -> confirm.

- Click event -> detail modal with actions (confirm/cancel/complete) role-based.

DELIVERABLES

- SQL migrations (tables, indexes, RLS, seed demo data)

- Edge functions: createPublicBooking, claimBooking

- Env vars + setup instructions; ensure build passes with 0 TS errors; unified design across admin+frontend.

Start by implementing immediately (no extra questions); choose sensible defaults and document them.

Prefer minimal new dependencies; reuse existing stack; keep files organized (lib/, features/, components/).
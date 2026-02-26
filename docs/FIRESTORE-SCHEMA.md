# Firestore schéma – migrácia z Supabase (PostgreSQL)

Mapovanie tabuliek na Firestore kolekcie a polia. Všetky ID sú reťazce (UUID z Supabase ostávajú ako string).

## Enums (reťazce v dokumentoch)

- **app_role:** `owner` | `admin` | `employee` | `customer`
- **appointment_status:** `pending` | `confirmed` | `cancelled` | `completed`
- **day_of_week:** `monday` | `tuesday` | `wednesday` | `thursday` | `friday` | `saturday` | `sunday`
- **hour_mode:** `open` | `closed` | `on_request`

---

## Kolekcie (top-level)

### `businesses`

Dokument ID = `id` (UUID).

| Pole | Typ | Popis |
|-----|-----|--------|
| name | string | Názov prevádzky |
| slug | string \| null | URL slug |
| address | string \| null | |
| phone | string \| null | |
| email | string \| null | |
| timezone | string | napr. Europe/Bratislava |
| lead_time_minutes | number | |
| max_days_ahead | number | |
| cancellation_hours | number | |
| onboarding_completed | boolean | |
| opening_hours | map | legacy JSON (voliteľné) |
| logo_url | string \| null | |
| smtp_config | map \| null | (citlivé – len server) |
| allow_admin_as_provider | boolean | |
| created_at | string | ISO |
| updated_at | string | ISO |

---

### `business_hours`

Kolekcia s `business_id` v dokumente. Query: `where("business_id", "==", id).orderBy("sort_order")`.

| Pole | Typ |
|-----|-----|
| business_id | string |
| day_of_week | string (enum) |
| start_time | string |
| end_time | string |
| mode | string (enum) |
| sort_order | number |
| created_at | string (ISO) |

---

### `business_date_overrides`

Kolekcia s `business_id`. Query: `where("business_id", "==", id).where("override_date", ">=", date)`.

| Pole | Typ |
|-----|-----|
| business_id | string |
| override_date | string (YYYY-MM-DD) |
| mode | string (enum) |
| start_time | string \| null |
| end_time | string \| null |
| label | string \| null |
| created_at | string (ISO) |

---

### `business_quick_links`

Kolekcia s `business_id`. Query: `where("business_id", "==", id).orderBy("sort_order")`.

| Pole | Typ |
|-----|-----|
| business_id | string |
| label | string |
| url | string |
| sort_order | number |
| created_at | string (ISO) |

---

### `employees`

Kolekcia s `business_id`. Query: `where("business_id", "==", id).where("is_active", "==", true).orderBy("display_name")`.

| Pole | Typ |
|-----|-----|
| business_id | string |
| display_name | string |
| email | string \| null |
| phone | string \| null |
| photo_url | string \| null |
| is_active | boolean |
| profile_id | string \| null |
| created_at | string (ISO) |
| updated_at | string (ISO) |

---

### `services`

Kolekcia s `business_id`. Query: `where("business_id", "==", id).where("is_active", "==", true).orderBy("name_sk")`.

| Pole | Typ |
|-----|-----|
| business_id | string |
| name_sk | string |
| description_sk | string \| null |
| duration_minutes | number |
| buffer_minutes | number |
| price | number \| null |
| category | string \| null |
| subcategory | string \| null |
| is_active | boolean |
| created_at | string (ISO) |
| updated_at | string (ISO) |

---

### `schedules`

Kolekcia s `employee_id`. Query: `where("employee_id", "in", ids)`.

| Pole | Typ |
|-----|-----|
| employee_id | string |
| day_of_week | string (enum) |
| start_time | string |
| end_time | string |
| created_at | string (ISO) |

---

### `employee_services`

Kolekcia (junction). Query: `where("employee_id", "==", id)` alebo `where("business_id", "==", id)`.

| Pole | Typ |
|-----|-----|
| employee_id | string |
| service_id | string |
| business_id | string (pre jednoduchší filter) |

---

### `customers`

Kolekcia s `business_id`. Query podľa email/phone pre upsert.

| Pole | Typ |
|-----|-----|
| business_id | string |
| full_name | string |
| email | string |
| phone | string \| null |
| notes | string \| null |
| profile_id | string \| null |
| created_at | string (ISO) |
| updated_at | string (ISO) |

---

### `appointments`

Kolekcia. Indexy: (business_id, start_at), (employee_id, start_at), (business_id, status, start_at).

| Pole | Typ |
|-----|-----|
| business_id | string |
| employee_id | string |
| service_id | string |
| customer_id | string |
| start_at | string (ISO) |
| end_at | string (ISO) |
| status | string (enum) |
| notes | string \| null |
| created_at | string (ISO) |
| updated_at | string (ISO) |

---

### `booking_claims`

Kolekcia pre claim tokeny. Query: `where("token_hash", "==", hash)` alebo `where("appointment_id", "==", id)`.

| Pole | Typ |
|-----|-----|
| appointment_id | string |
| business_id | string |
| email | string |
| token_hash | string |
| expires_at | string (ISO) |
| used_at | string \| null (ISO) |
| created_at | string (ISO) |

---

### `profiles`

Dokument ID = Firebase Auth UID (alebo Supabase auth.uid po migrácii).

| Pole | Typ |
|-----|-----|
| email | string \| null |
| full_name | string \| null |
| phone | string \| null |
| avatar_url | string \| null |
| created_at | string (ISO) |
| updated_at | string (ISO) |

---

### `memberships`

Kolekcia. **Dokument ID musí byť zložený:** `profile_id + '_' + business_id` (kvôli Firestore rules – kontrola admina). Query: `where("profile_id", "==", uid)` pre aktuálneho užívateľa.

| Pole | Typ |
|-----|-----|
| profile_id | string |
| business_id | string |
| role | string (enum app_role) |
| created_at | string (ISO) |

---

### `passkeys`

Kolekcia pre WebAuthn. Query: `where("profile_id", "==", uid)`.

| Pole | Typ |
|-----|-----|
| profile_id | string |
| credential_id | string |
| public_key | string |
| sign_count | number |
| device_name | string \| null |
| last_used_at | string \| null (ISO) |
| created_at | string (ISO) |

---

### `sync_dedup`

Kolekcia pre idempotency (sync-push). Query: podľa idempotency_key + business_id.

| Pole | Typ |
|-----|-----|
| business_id | string |
| idempotency_key | string |
| action_type | string |
| result | map \| null |
| created_at | string (ISO) |

---

### `onboarding_answers`

Kolekcia s `business_id`. Query: `where("business_id", "==", id)`.

| Pole | Typ |
|-----|-----|
| business_id | string |
| step | number |
| data | map | JSON krokovať údajov |
| created_at | string (ISO) |
| updated_at | string (ISO) |

---

### `user_roles` (voliteľné)

Ak sa používa globálna rola. Inak rola len v memberships.

| Pole | Typ |
|-----|-----|
| user_id | string |
| role | string (enum) |

---

## Indexy (firestore.indexes.json)

Potrebné zložené indexy:

- **appointments:** (business_id ASC, start_at ASC), (employee_id ASC, start_at ASC), (business_id ASC, status ASC, start_at ASC)
- **business_hours:** (business_id ASC, sort_order ASC)
- **business_date_overrides:** (business_id ASC, override_date ASC)
- **memberships:** (profile_id ASC), (business_id ASC)
- **schedules:** (employee_id ASC)
- **passkeys:** (profile_id ASC)
- **sync_dedup:** (business_id ASC, idempotency_key ASC) – unique constraint sa rieši v Cloud Function

---

## Bezpečnosť (firestore.rules)

- **profiles:** read/write len ak `request.auth.uid == userId` (vlastný profil); create povolené pre authenticated.
- **memberships:** read ak authenticated; write len cez Cloud Function alebo ak je user owner/admin (overiť v pravidle cez get profile a membership).
- **businesses:** verejné read na vybrané polia (name, slug, timezone, opening_hours, business_hours subcollection) pre rpc_get_public_business_info; plný read/write len pre admin/owner (cez membership).
- **employees, services, schedules, business_hours, business_date_overrides, business_quick_links:** read/write podľa business membership (admin/owner).
- **customers:** podľa business membership.
- **appointments:** create verejné len cez Cloud Function (create-public-booking); read/update podľa business membership alebo employee (vlastné termíny).
- **booking_claims:** len Cloud Function (zápis a čítanie).
- **passkeys:** read/write len vlastné (profile_id == request.auth.uid).
- **sync_dedup, onboarding_answers:** podľa business membership.

Detailné pravidlá sú v `firestore.rules`.

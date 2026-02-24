# Email Notifikácie - Implementačná Dokumentácia

## Prehľad

Implementovaný **Proper Fix** riešenie pre emailové notifikácie pri rezerváciách v salónovom systéme.

### Funkčné požiadavky (splnené)

| Požiadavka | Status | Implementácia |
|------------|--------|---------------|
| Admin dostáva všetky notifikácie | ✅ | `get_business_admin_emails()` RPC |
| Zamestnanec dostáva iba svoje rezervácie | ✅ | Kontrola `appointment.employee_id` |
| Iný zamestnanec nedostáva cudzie emaily | ✅ | Backend-only recipient resolution |
| Create/Update/Cancel trigger | ✅ | Integrácia v `create-public-booking` a `sync-push` |
| Neaktívni používatelia preskočení | ✅ | Kontrola `is_active = true` |
| Používatelia bez emailu - warning log | ✅ | Validácia emailu pred odoslaním |
| Deduplikácia emailov | ✅ | `notification_logs` tabuľka + `was_notification_sent()` |
| Admin+Zamestnanec = 1 email | ✅ | Kontrola duplicity v zozname príjemcov |

---

## Architektúra

### Dátový model

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   businesses    │────▶│ notification_logs│◄────│  appointments   │
│  (smtp_config)  │     │  (audit + dedup) │     │ (employee_id)   │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                          │
                              ┌───────────────────────────┘
                              ▼
                    ┌─────────────────┐
                    │    employees    │
                    │ (email, is_active│
                    │  profile_id)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    profiles     │
                    │    (email)      │
                    └─────────────────┘
                             │
                    ┌────────▼────────┐
                    │   memberships   │
                    │(role: admin/owner│
                    │   /employee)    │
                    └─────────────────┘
```

### Flow diagram

```
┌─────────────────┐     ┌─────────────────────────┐     ┌─────────────────┐
│  Verejná        │────▶│ create-public-booking   │────▶│  Zákazník       │
│  rezervácia     │     │  (edge function)        │     │  dostane email  │
└─────────────────┘     └──────────┬──────────────┘     └─────────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │ send-appointment-notification│
                    │    (edge function)           │
                    │                              │
                    │  1. Načíta appointment       │
                    │  2. Získa admin emails       │
                    │  3. Získa employee email     │
                    │  4. Deduplikácia             │
                    │  5. Odošle emaily           │
                    │  6. Loguje výsledky          │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                             ▼
        ┌───────────────────┐         ┌───────────────────┐
        │   Admini          │         │   Zamestnanec     │
        │ (všetky rezerv.)  │         │ (iba svoje rez.)  │
        └───────────────────┘         └───────────────────┘
```

---

## Súbory

### 1. Databázová migrácia
**Súbor:** `supabase/migrations/20260225000001_notification_system.sql`

**Obsahuje:**
- `notification_logs` tabuľka - audit a deduplikácia
- `was_notification_sent()` - kontrola duplicity
- `get_business_admin_emails()` - získanie admin emailov
- `get_appointment_employee_email()` - získanie employee emailu
- RLS policies pre bezpečnosť

### 2. Edge Function - Notifikácie
**Súbor:** `supabase/functions/send-appointment-notification/index.ts`

**Hlavné funkcie:**
- `buildSubject()` - generovanie predmetu emailu
- `buildEmailHtml()` - generovanie HTML obsahu
- `getEventMessage()` - lokalizované správy

**Typy príjemcov:**
- `admin` - vidí všetky detaily vrátane kontaktov na zákazníka
- `employee` - vidí iba svoje rezervácie, základné info o zákazníkovi

### 3. Integrácia - Verejné rezervácie
**Súbor:** `supabase/functions/create-public-booking/index.ts`

**Zmeny:**
- Po vytvorení rezervácie sa volá `send-appointment-notification` s `event_type: "created"`

### 4. Integrácia - Admin/Reception
**Súbor:** `supabase/functions/sync-push/index.ts`

**Zmeny:**
- `triggerNotification()` helper funkcia
- Volanie notifikácie pre CREATE, UPDATE, CANCEL akcie

---

## API Endpoint

### `POST /functions/v1/send-appointment-notification`

**Request:**
```json
{
  "appointment_id": "uuid",
  "business_id": "uuid", 
  "event_type": "created" | "updated" | "cancelled"
}
```

**Response:**
```json
{
  "success": true,
  "sent": 2,
  "failed": 0,
  "results": [
    {
      "email": "admin@salon.sk",
      "type": "admin",
      "status": "sent"
    },
    {
      "email": "employee@salon.sk",
      "type": "employee", 
      "status": "sent"
    }
  ]
}
```

---

## Bezpečnostné pravidlá

### Backend-only enforcement
```typescript
// Recipient list sa zostavuje výhradne na serveri
const recipients = [];

// 1. Admini - zo serverovej DB
const { data: adminEmails } = await supabase.rpc(
  "get_business_admin_emails", 
  { _business_id: business_id }
);

// 2. Zamestnanec - zo serverovej DB  
const employeeEmail = appointment.employees?.email;
```

### Validácie
- ✅ Používateľ musí byť aktívny (`is_active = true`)
- ✅ Email musí existovať a byť validný
- ✅ Zamestnanec dostáva IBA svoje rezervácie
- ✅ Deduplikácia cez `notification_logs` tabuľku

---

## Email Templates

### Admin Template
```
Predmet: Nová rezervácia – Strihanie vlasov – 25. február 2025 – Jana

Obsahuje:
- Stav rezervácie
- Služba
- Zamestnanec
- Zákazník (meno, email, telefón)
- Dátum a čas
- Trvanie a cena
- Poznámka
```

### Employee Template
```
Predmet: Nová rezervácia – pridelená vám – Strihanie vlasov – 25. február 2025

Obsahuje:
- Stav rezervácie
- Služba
- Zákazník (meno)
- Dátum a čas
- Trvanie a cena
- Poznámka

(Neobsahuje kontaktné údaje zákazníka - tie vidí iba admin)
```

---

## Testovací plán

### 1. Admin notifikácie
```gherkin
Given: Admin má email v profile
When: Vytvorí sa nová rezervácia
Then: Admin dostane email s všetkými detailmi
```

### 2. Employee notifikácie
```gherkin
Given: Zamestnanec má email a je priradený k rezervácii
When: Vytvorí sa rezervácia pre tohto zamestnanca
Then: Zamestnanec dostane email
And: Iní zamestnanci nedostanú email
```

### 3. Deduplikácia
```gherkin
Given: Notifikácia už bola odoslaná pre danú udalosť
When: Systém sa pokúsi odoslať notifikáciu znova
Then: Email sa neodošle (bude preskočený)
And: V logu bude záznam o preskočení
```

### 4. Neaktívni používatelia
```gherkin
Given: Zamestnanec má is_active = false
When: Vytvorí sa rezervácia pre tohto zamestnanca
Then: Email sa neodošle
And: V logu bude warning
```

---

## Deployment

### 1. Aplikovanie migrácie
```bash
supabase db push
```

### 2. Deployment edge functions
```bash
supabase functions deploy send-appointment-notification
supabase functions deploy create-public-booking
supabase functions deploy sync-push
```

### 3. Environment variables
Uisti sa, že máš nastavené:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

---

## Monitoring a Troubleshooting

### Logy
Všetky notifikácie sa logujú do `notification_logs` tabuľky:
```sql
SELECT * FROM notification_logs 
WHERE appointment_id = 'uuid' 
ORDER BY created_at DESC;
```

### Stavové kódy
- `pending` - notifikácia sa pripravuje
- `sent` - email úspešne odoslaný
- `failed` - chyba pri odosielaní (detail v `error_message`)
- `skipped` - preskočená (duplikát alebo neplatný email)

### Debug
```sql
-- Kontrola, či bola notifikácia odoslaná
SELECT was_notification_sent('appointment-uuid', 'created', 'admin@salon.sk');

-- Zoznam adminov pre business
SELECT * FROM get_business_admin_emails('business-uuid');

-- Email zamestnanca pre appointment
SELECT * FROM get_appointment_employee_email('appointment-uuid');
```

---

## Rozšírenia (budúce vylepšenia)

### 1. User preferences
Pridať do `profiles` tabuľky:
```sql
ALTER TABLE profiles ADD COLUMN notification_settings JSONB DEFAULT '{
  "email_enabled": true,
  "notify_on_create": true,
  "notify_on_update": true,
  "notify_on_cancel": true
}';
```

### 2. Queue-based processing
Pre vysoké objemy použiť:
- Supabase Background Tasks
- Redis queue
- Retry mechanizmus s exponenciálnym backoff

### 3. Rich templates
- Pridať logo businessu
- Linky do admin rozhrania
- QR kód pre rýchly prístup

---

## Zhrnutie

Implementované riešenie spĺňa všetky požiadavky:

✅ **Backend-only** - žiadny frontend override  
✅ **Security** - employee vidí iba svoje rezervácie  
✅ **Deduplikácia** - žiadne duplicitné emaily  
✅ **Audit** - kompletné logovanie  
✅ **Flexibilita** - podpora create/update/cancel  
✅ **Reliability** - error handling a logging  

**Status:** Pripravené na deployment a testovanie.

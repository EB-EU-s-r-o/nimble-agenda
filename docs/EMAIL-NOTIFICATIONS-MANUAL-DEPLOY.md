# 📧 Email Notifikácie - Manuálny Deployment

## ⚠️ Dôležité
CLI prístup nie je dostupný. Deployment sa vykoná manuálne cez Supabase Dashboard.

---

## 🚀 Postup Deploymentu

### Krok 1: Databázová Migrácia (SQL Editor)

1. Otvor **Supabase Dashboard** → **SQL Editor**
2. Vytvor nový query
3. Skopíruj obsah súboru: `supabase/migrations/20260225000001_notification_system.sql`
4. Spusti (Run)

**Overenie:**
```sql
SELECT * FROM notification_logs LIMIT 1;
-- Mala by sa zobraziť prázdna tabuľka (bez chyby)
```

---

### Krok 2: Edge Function - send-appointment-notification

1. Otvor **Supabase Dashboard** → **Edge Functions**
2. Klikni **New Function**
3. Nastav:
   - **Name**: `send-appointment-notification`
   - **Verify JWT**: ❌ (unchecked)
4. Skopíruj obsah súboru: `supabase/functions/send-appointment-notification/index.ts`
5. Klikni **Deploy**

---

### Krok 3: Update Edge Function - create-public-booking

1. Otvor **Supabase Dashboard** → **Edge Functions** → `create-public-booking`
2. Klikni **Edit**
3. Nájdi časť s komentárom `// 8. Send confirmation email`
4. Nahraď za nový kód (pozri nižšie)
5. Klikni **Deploy**

**Kód na pridanie:**
```typescript
// 8. Send notification to admin and employee
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
fetch(`${supabaseUrl}/functions/v1/send-appointment-notification`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${serviceRoleKey}`,
  },
  body: JSON.stringify({ 
    appointment_id: appointment.id, 
    business_id,
    event_type: "created"
  }),
}).catch((e) => console.error("Notification trigger failed:", e));
```

---

### Krok 4: Update Edge Function - sync-push

1. Otvor **Supabase Dashboard** → **Edge Functions** → `sync-push`
2. Klikni **Edit**
3. Nájdi časť kde sa spracovávajú akcie (CREATE, UPDATE, DELETE)
4. Pridaj notifikačný kód (pozri nižšie)
5. Klikni **Deploy**

**Kód na pridanie pre CREATE:**
```typescript
// After successful insert
await supabase.functions.invoke("send-appointment-notification", {
  body: { 
    appointment_id: data.id, 
    business_id: businessId,
    event_type: "created"
  }
});
```

**Kód na pridanie pre UPDATE (keď sa zmení status na cancelled):**
```typescript
// When status changes to cancelled
if (payload.status === 'cancelled') {
  await supabase.functions.invoke("send-appointment-notification", {
    body: { 
      appointment_id: id, 
      business_id: businessId,
      event_type: "cancelled"
    }
  });
} else {
  // Regular update
  await supabase.functions.invoke("send-appointment-notification", {
    body: { 
      appointment_id: id, 
      business_id: businessId,
      event_type: "updated"
    }
  });
}
```

---

## ✅ Overenie Deploymentu

### Test 1: Databáza
```sql
-- Skontroluj tabuľku
SELECT COUNT(*) FROM notification_logs;

-- Skontroluj funkcie
SELECT proname FROM pg_proc WHERE proname LIKE '%notification%';
```

### Test 2: Edge Function
```bash
# Test cez HTTP
curl -X POST https://eudwjgdijylsgcnncxeg.supabase.co/functions/v1/send-appointment-notification \
  -H "Authorization: Bearer <service-role-key>" \
  -H "Content-Type: application/json" \
  -d '{"appointment_id": "test-id", "business_id": "test-biz", "event_type": "created"}'
```

### Test 3: End-to-End
1. Vytvor rezerváciu cez booking page
2. Skontroluj `notification_logs` tabuľku
3. Over email v schránke admina

---

## 🔧 Riešenie Problémov

| Problém | Riešenie |
|---------|----------|
| `notification_logs` neexistuje | Spusti SQL migráciu znovu |
| Function nefunguje | Skontroluj Verify JWT = false |
| Email neprichádza | Skontroluj SMTP config v `businesses.smtp_config` |
| Duplicitné emaily | Skontroluj UNIQUE constraint v `notification_logs` |

---

## 📞 Podpora

Ak narazíš na problém:
1. Skontroluj **Logs** v Supabase Dashboard → Edge Functions
2. Skontroluj **Database** → Logs pre SQL chyby
3. Over **SMTP config** v admin nastaveniach

# Čo funguje a čo nie (pre phd-booking na Spark)

Krátky prehľad bez ohľadu na drobnosti – len funkčné vs nefunkčné veci.

---

## Funguje (po tvojom nastavení)

| Vec | Poznámka |
|-----|----------|
| **Prihlásenie Google** | Firebase Auth, redirect na /admin |
| **Supabase REST (admin)** | employees, services, appointments, businesses – po nastavení claimu `role: 'authenticated'` (skript alebo Blaze + ensureSupabaseRole) |
| **Cookie consent + consent-event** | Edge Function consent-event je nasadená, eventy sa logujú |
| **Firebase Hosting** | `npm run deploy:firebase` – Spark stačí |
| **Verejná rezervácia (booking)** | Ak je nasadená Supabase Edge Function **create-public-booking** (viď nižšie) |
| **IndexedDB / PWA** | Ošetrené pri zlyhaní (súkromné okno) – SW sa zruší, app nespadne |

---

## Nefunguje alebo funguje len čiastočne

### 1. Firebase Cloud Functions (Spark = bez Blaze)

Na Spark pláne **nemôžeš** nasadiť Cloud Functions. Tieto veci teda **nefungujú**, kým neprejdeš na Blaze:

| Funkcia | Kde sa volá | Dôsledok |
|---------|-------------|----------|
| **claimBooking** | Auth.tsx – po registrácii / prihlásení, ak bol v URL claim token | Prepojenie rezervácie s účtom sa neuskutoční (ticho zlyhá) |
| **syncPush / syncPull** | Offline sync (recepcia) | Offline fronta sa nesynchronizuje so serverom |
| **ensureSupabaseRole** | AuthContext po prihlásení | Nerieš – claim nastavíš skriptom `node functions/scripts/set-supabase-role-claims.mjs` pre existujúcich; noví používatelia = spustiť skript znova alebo ísť na Blaze |
| **WebAuthn** (webauthnRegister, webauthnAuthenticate) | Prihlásenie bez hesla | Nepoužíva sa ak nemáš Blaze |

**Riešenie:** Buď upgrade na Blaze + `firebase deploy --only functions`, alebo tieto scenáre nepoužívať (claim booking cez iný flow, offline sync ignorovať).

---

### 2. Supabase Edge Functions – treba nasadiť

Tieto funkcie sú v repozitári, ale musia byť **nasadené** v tvojom Supabase projekte. Ak nie sú, príslušná feature zlyhá alebo vráti 404.

| Funkcia | Kde sa volá | Čo sa stane ak nie je nasadená |
|---------|-------------|--------------------------------|
| **create-public-booking** | Verejný booking (kalendár) | Rezervácia z webu nebude fungovať (chyba / 404) |
| **save-smtp-config** | Admin → Nastavenia (SMTP) | Uloženie SMTP sa nepodarí |
| **consent-event** | Cookie súhlas | Už nasadené – OK |

**Čo spraviť:** V koreni projektu:

```bash
npx supabase link --project-ref hrkwqdvfeudxkqttpgls
npx supabase functions deploy create-public-booking
npx supabase functions deploy save-smtp-config
```

(Ďalšie Edge Functions z `supabase/functions/` nasaď podľa potreby – send-booking-email, send-appointment-notification, sync-push, sync-pull, claim-booking, webauthn-*, seed-demo-accounts. Niektoré môžu duplikovať Firebase Functions alebo vyžadovať secrets.)

---

### 3. Migrácie a RLS v Supabase

Ak si **nepustil migrácie** (tabuľky, RLS, `current_profile_id()`), admin dáta (employees, services, appointments) môžu vracať prázdne alebo 403 aj s platným JWT.

**Čo spraviť:**  
- Supabase Dashboard → SQL Editor, alebo `npx supabase db push`  
- Spustiť migrácie v poradí (firebase_auth, firebase_rls_use_current_profile_id, atď.) – pozri `supabase/migrations/` a TODO.md.

---

## Odporúčaný poriadok (čo riešiť ako prvé)

1. **Nasadiť Supabase Edge Functions**, ktoré frontend naozaj volá:  
   `create-public-booking`, `save-smtp-config`. (consent-event už máš.)
2. **Overiť migrácie a RLS** – že v Supabase existujú tabuľky a politiky pre Firebase JWT (current_profile_id).
3. **Firebase Functions (claim, offline sync, webauthn):** rozhodnúť – buď Blaze + deploy, alebo tieto features nepovažovať za potrebné.

Ak napíšeš, ktorú časť chceš riešiť ako prvú (verejná rezervácia, SMTP, claim booking, offline), môžem rozpísať presné kroky len pre ňu.

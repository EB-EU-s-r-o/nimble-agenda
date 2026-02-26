# Audit: Firebase na Spark (zadarmo) vs Blaze (platený)

Tento dokument sumarizuje, **čo všetko funguje** na bezplatnom pláne **Spark** a **o čo prichádzate**, kým nemáte platený plán **Blaze**. Cieľ: mať na Spark čo najviac funkcií a vedieť presne, čo sa odomkne po prechode na Blaze.

---

## 1. Čo funguje na Spark (zadarmo)

| Oblasť | Čo funguje | Poznámka |
|--------|-------------|----------|
| **Firebase Hosting** | Nasadenie SPA z `dist`, všetky cesty (`/`, `/booking`, `/admin`, …) servujú `index.html` | `npm run deploy:firebase` alebo `deploy:firebase:first` |
| **Firestore** | Pravidlá (rules) a indexy sa dajú nasadiť | `firebase deploy --only firestore` |
| **Firebase Authentication** | Prihlásenie / registrácia / reset hesla (email + heslo) | Žiadna Function nie je potrebná |
| **Firestore – čítanie a zápis z klienta** | Všetko, čo povolia pravidlá: profiles, memberships, businesses, employees, services, appointments (čítanie/update), atď. | Admin kalendár, zoznamy, nastavenia – všetko, čo nepotrebuje serverovú logiku |
| **Analytics** | Základné Analytics (ak je zapnuté v projekte) | V rámci bezplatných kvót |
| **Verejná stránka rezervácií** | UI, výber služby, pracovníka, dátumu, času, formulár | **Vytvorenie rezervácie v DB a e-maily nefungujú** – potrebujú Cloud Function |

Na Spark teda máte plnohodnotnú **štatickú aplikáciu** s Auth a priamym prístupom do Firestore podľa pravidiel. Všetko, čo vyžaduje **serverovú logiku** (rezervácie, e-maily, passkey, sync, claim), **bez Blaze nebeží**.

---

## 2. Čo nefunguje bez Blaze (vyžaduje Cloud Functions)

Cloud Functions vyžadujú **Blaze** (pay-as-you-go), pretože používajú Cloud Build a Artifact Registry. Nasadiť ich na Spark nie je možné.

| Funkcia / Flow | Cloud Function | Čo používateľ nevie urobiť na Spark |
|----------------|----------------|-------------------------------------|
| **Verejná rezervácia – odoslanie** | `createPublicBooking` (HTTP) | Zákazník vyplní formulár, ale rezervácia sa **nevytvorí** v Firestore a nepošle sa potvrdenie e-mailom. Zobrazí sa chyba typu „VITE_FIREBASE_FUNCTIONS_URL nie je nastavená“ alebo timeout. |
| **Prepojenie rezervácie s účtom (claim)** | `claimBooking` (callable) | Po registrácii sa rezervácia **neprepojí** s novým účtom (nebude v „Moje rezervácie“). |
| **Passkey (WebAuthn)** | `webauthnRegisterChallenge`, `webauthnRegister`, `webauthnAuthenticateChallenge`, `webauthnAuthenticate` | **Registrácia a prihlásenie cez passkey nefungujú** – chýba serverové overenie. |
| **Offline sync (push/pull)** | `syncPush`, `syncPull` (callable) | **Sync zmien z/do Firestore v offline móde nefunguje** – recepcia a mobilné zariadenia nemôžu synchronizovať dáta. |
| **E-maily (potvrdenie rezervácie, notifikácie)** | `sendBookingEmail`, `sendAppointmentNotification` (HTTP, volané z createPublicBooking) | Zákazník **nedostane e-mail** po rezervácii; admin **nedostane notifikáciu** o novej rezervácii. |
| **Uloženie SMTP nastavení** | `saveSmtpConfig` (callable) | V nastaveniach **nejde uložiť** SMTP konfigurácia (volá sa callable). |
| **Seed demo účtov** | `seedDemoAccounts` (callable) | **Vytvorenie demo účtov** cez callable nefunguje (ak to niekde voláte). |

---

## 3. Súhrn: „O čo všetko sme prišli“ bez plateného plánu

- **Verejná rezervácia** – zákazník nemôže dokončiť rezerváciu (žiadna nová položka v kalendári, žiadny e-mail).
- **Claim rezervácie** – nový používateľ po registrácii nemá rezerváciu prepojenú s účtom.
- **Passkey** – celý flow registrácie a prihlásenia cez passkey je nefunkčný.
- **Offline sync** – push/pull cez callable nefunguje (recepcia, mobil).
- **E-maily a notifikácie** – žiadne potvrdenia rezervácií ani notifikácie pre admina.
- **SMTP nastavenia** – uloženie cez callable nefunguje.
- **Demo seed** – volanie `seedDemoAccounts` nefunguje.

Všetko vyššie sa **odomkne** po prechode na **Blaze** a nasadení Functions (`firebase deploy --only functions` alebo plný `firebase deploy`).

---

## 4. Čo sme spravili, aby na Spark fungovalo čo najviac

- **Hosting:** Build z `dist`, SPA rewrites (`**` → `/index.html`), aby fungovali všetky cesty po deployi.
- **Firestore:** Opravené pravidlá (helpery s `dbId`) a odstránené single-field indexy z `firestore.indexes.json`, aby `firebase deploy --only firestore` prebehol.
- **Skripty:** `npm run deploy:firebase` (len hosting), `npm run deploy:firebase:first` (hosting + firestore) – bez potreby Blaze.
- **Dokumentácia:** V MIGRATION-FIREBASE.md je popísaný rozdiel Spark vs Blaze a kedy čo nasadiť.

Na Spark teda máte **maximálne využité** Hosting + Firestore + Auth. Chýbajú výlučne funkcie závislé na Cloud Functions.

---

## 5. Odporúčanie

- **Ak chcete plnú funkcionalitu** (rezervácie, e-maily, passkey, sync, claim):  
  - **Blaze:** prejdite na Blaze a nasaďte Firebase Functions.  
  - **Bez Blaze:** použite **Supabase** ako náhradu – Edge Functions + PostgreSQL (bezplatný tier). Pozri **[docs/SUPABASE-AS-BACKEND.md](SUPABASE-AS-BACKEND.md)**. Verejná rezervácia už môže volať Supabase, ak je nastavená `VITE_SUPABASE_URL` a `VITE_SUPABASE_PUBLISHABLE_KEY` (a nie je `VITE_FIREBASE_FUNCTIONS_URL`).
- **Ak chcete zatiaľ len „žiabu“** (štatická stránka + prihlásenie + prezeranie/úpravy v Firestore podľa pravidiel): **Spark stačí**; používajte `deploy:firebase:first`.

---

## 6. Rýchly prehľad

| Plán | Hosting | Firestore (rules + indexy) | Auth (email/heslo) | Firestore čítanie/zápis | Rezervácie (create + e-mail) | Claim, Passkey, Sync, SMTP |
|------|---------|-----------------------------|--------------------|--------------------------|-----------------------------|----------------------------|
| **Spark** | áno | áno | áno | áno | nie | nie |
| **Blaze** | áno | áno | áno | áno | áno (po deployi Functions) | áno (po deployi Functions) |

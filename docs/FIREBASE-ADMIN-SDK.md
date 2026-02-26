# Firebase Admin SDK a service account

Firebase Admin SDK sa v projekte používa v **Cloud Functions** (Firestore, Auth, atď.). Pri deployi na Firebase sú oprávnenia nastavené automaticky, **service account key súbor nepotrebuješ do repozitára dávať ani do kódu Functions**.

## Kedy service account key potrebuješ

- **Lokálne skripty**, ktoré volajú Admin SDK (napr. migračný skript `scripts/migrate-supabase-to-firestore/transform-and-import.ts`).
- **Lokálne spúšťanie Cloud Functions** (emulátory) – ak chceš použiť reálny Firestore namiesto emulátora.

## Čo si stiahol

Súbor typu:

`phd-booking-firebase-adminsdk-fbsvc-61cc484470.json`

Je to **súkromný kľúč** pre service account. **Nikdy ho necommituj do gitu** a nedávaj ho do verejného úložiska.

## Odporúčaný postup

1. **Umiestnenie súboru**  
   Daj ho mimo repozitár (napr. `C:\Users\42195\firebase-keys\phd-booking-service-account.json`) alebo do koreňa projektu s názvom, ktorý je v `.gitignore` (pozri nižšie).

2. **Bezpečnostná poistka v `.gitignore`** – uisti sa, že JSON nikdy nepôjde do gitu:
   ```
   *serviceAccount*.json
   *-firebase-adminsdk-*.json
   **/*adminsdk*.json
   **/phd-booking-firebase-adminsdk-*.json
   ```

3. **Lokálne skripty (Node)**  
   Nastav premennú prostredia na cestu k JSON súboru, napr. v PowerShell:
   ```powershell
   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Users\42195\firebase-keys\phd-booking-service-account.json"
   node scripts/migrate-supabase-to-firestore/transform-and-import.ts
   ```
   Alebo v `.env` (ktorý je v `.gitignore`):
   ```
   GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\phd-booking-firebase-adminsdk-fbsvc-61cc484470.json
   ```

4. **Cloud Functions v produkcii**  
   V Firebase Console sa pri deployi používa service account projektu automaticky. V `functions/src/index.ts` stačí:
   ```ts
   import { initializeApp } from "firebase-admin/app";
   initializeApp();
   ```
   Žiadny `require("path/to/serviceAccountKey.json")` ani `cert(...)` v kóde Functions nepotrebuješ.

## Snippet z Firebase dokumentácie (Node)

Ak by si niekde (napr. v lokálnom skripte) inicializoval Admin SDK s konkrétnym súborom:

```js
var admin = require("firebase-admin");
var serviceAccount = require("path/to/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
```

V tomto projekte je lepšie použiť **premennú prostredia** namiesto `require()` na key súbor, aby sa key nedostal do kódu. Migračný skript už to rieši: ak je nastavené `GOOGLE_APPLICATION_CREDENTIALS`, načíta credential z neho; inak použije Application Default (napr. `gcloud auth application-default login`).

## Zhrnutie

| Kde | Potrebuješ service account key? |
|-----|----------------------------------|
| Cloud Functions (deploy na Firebase) | **Nie** – Firebase to rieši sám |
| Lokálne skripty (migrácia, import) | **Áno** – nastav `GOOGLE_APPLICATION_CREDENTIALS` na cestu k JSON |
| Frontend (Vite/React) | **Nie** – frontend používa Firebase Client SDK (apiKey z projektu) |

Sťahovaný súbor si ulož na bezpečné miesto, pridaj výše uvedené riadky do `.gitignore` a pri lokálnych skriptoch používaj len premennú `GOOGLE_APPLICATION_CREDENTIALS`.

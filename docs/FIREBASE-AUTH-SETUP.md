# Firebase Auth – nastavenie so Supabase

Ak chceš použiť **Firebase Authentication** namiesto (alebo vedľa) Supabase Auth, aplikácia to podporuje. Supabase ostáva ako databáza a API; prihlásenie prebieha cez Firebase a do Supabase sa posiela Firebase JWT.

## Spustenie setupu cez CLI

V koreni projektu:

```powershell
# Automatický setup: načíta z .env SUPABASE_DB_URL, SUPABASE_ACCESS_TOKEN, VITE_FIREBASE_PROJECT_ID a spustí kroky 1–5
.\scripts\firebase-setup-auto.ps1
```

Aby kroky 2 (Supabase db push) a 3 (Firebase migrácie cez psql) prebehli cez CLI, pridaj do `.env` (voliteľne):
- **SUPABASE_DB_URL** – connection string (napr. `postgresql://postgres:HESLO@db.XXXX.supabase.co:5432/postgres`) – potrebné pre krok 3
- **SUPABASE_ACCESS_TOKEN** – token z Supabase Dashboard → Account → Access Tokens – potrebné pre krok 2 (link + db push)

Alebo bez načítania z .env (premenné môžeš nastaviť v relácii predtým):

```powershell
# Kompletný setup (npm install, pokus o Supabase push, inštrukcie)
.\scripts\firebase-setup-complete.ps1
```

Ak máš connection string do Supabase DB (heslo z Dashboard → Settings → Database), môžeš spustiť **len Firebase migrácie** cez psql:

```powershell
# Nastav connection string (nahraď HESLO skutočným heslom)
$env:SUPABASE_DB_URL = "postgresql://postgres:HESLO@db.eudwjgdijylsgcnncxeg.supabase.co:5432/postgres"
.\scripts\run-firebase-migrations-psql.ps1
```

Potom znova spusti celý setup – v kroku 3 sa migrácie aplikujú:

```powershell
.\scripts\firebase-setup-complete.ps1
```

---

## 1. Firebase projekt

1. Otvor [Firebase Console](https://console.firebase.google.com/) a vytvor projekt (alebo použij existujúci).
2. V projekte: **Project Settings** (ikona ozubeného kolesa) → **General** → **Your apps** → pridaj **Web app** (npm).
3. Skopíruj konfiguráciu: `apiKey`, `authDomain`, `projectId`, `appId`.

## 2. Premenné prostredia

Do `.env` (a na Vercel do Environment Variables) pridaj:

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...  # napr. tvoj-projekt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_APP_ID=...
```

Ak sú tieto premenné nastavené, aplikácia používa Firebase na prihlásenie (email/heslo, Google). Ak nie sú, používa sa Supabase Auth ako doteraz.

## 2b. Prihlásenie cez Google (bez Cloud Functions)

**Sign in with Google** funguje čisto cez Firebase Authentication – **nepotrebuješ Cloud Functions** ani Blaze plán. Stačí zapnúť Google v konzole a v aplikácii sa zobrazí tlačidlo „Prihlásiť sa cez Google“.

1. **Firebase Console** → tvoj projekt → **Authentication** → **Sign-in method**.
2. Klikni na **Google** → prepni **Enable** → vyplň **Project support email** (napr. tvoj email) → **Save**.
3. (Voliteľne) **Authentication** → **Settings** → **Authorized domains** – skontroluj, že je tam `localhost` a tvoja produkčná doména (napr. `papihairdesign.sk` alebo doména Vercel), aby popup/redirect fungoval.
4. **Web app:** Potrebuješ len **Web client ID** z Google (Firebase ho zobrazí v Sign-in method → Google → Web SDK configuration). Správa o SHA-1 release fingerprint sa týka **Android** apps – pre web ju môžeš ignorovať. Ak chceš použiť konkrétny OAuth klient, pridaj do `.env`: `VITE_GOOGLE_OAUTH_CLIENT_ID=<Web client ID>` (pozri `.env.example`).

Aplikácia používa `signInWithPopup` a `GoogleAuthProvider` z Firebase JS SDK; prihlásenie prebehne v prehliadači, bez volania backendu. Po úspechu používateľ ide na `/admin`. Ak máš zapnuté aj Supabase Third-Party Auth (krok 3), Firebase JWT sa môže posielať do Supabase pre prístup k dátam.

## 3. Supabase – Third-Party Auth (Firebase)

1. **Dashboard:** Supabase → tvoj projekt → **Authentication** → **Providers** alebo **Third-Party Auth**.
2. Pridaj integráciu **Firebase** a zadaj **Firebase Project ID** (rovnaké ako `VITE_FIREBASE_PROJECT_ID`).
3. V `supabase/config.toml` (ak pushuješ config cez CLI) máš:
   ```toml
   [auth.third_party.firebase]
   enabled = true
   project_id = "tvoj-firebase-project-id"
   ```
   Nahraď `your-firebase-project-id` skutočným Firebase Project ID.

## 4. Firebase – custom claim `role: 'authenticated'`

Supabase potrebuje v JWT claim **role = 'authenticated'**, aby priradil správnu Postgres rolu. V Firebase to treba nastaviť pre všetkých používateľov.

### Možnosť A: Blocking function (Firebase Auth s Identity Platform)

Ak máš Identity Platform, môžeš použiť blocking function (napr. `beforeUserCreated` / `beforeUserSignedIn`), ktorá vráti `customClaims: { role: 'authenticated' }`. Dokumentácia: [Firebase Blocking Functions](https://firebase.google.com/docs/auth/extend-with-blocking-functions).

### Možnosť B: Cloud Function (onCreate) + Admin SDK pre existujúcich

1. V Firebase projekte nainštaluj a nasaď Cloud Function, ktorá pri vytvorení používateľa nastaví custom claim (alebo použiť jednorazový skript s Admin SDK).
2. Pre **existujúcich** používateľov spusti skript s Firebase Admin SDK: `setCustomUserClaims(uid, { role: 'authenticated' })` pre každého používateľa. Návod: [Supabase – Firebase Auth](https://supabase.com/docs/guides/auth/third-party/firebase-auth).

## 5. Migrácie v Supabase

Spusti migrácie v tomto poradí:

1. **20260223120000_firebase_auth.sql** – pridáva tabuľku `firebase_profile_map`, funkciu `current_profile_id()`, RPC `get_my_profile`, `get_my_memberships`, `ensure_my_firebase_profile` a upraví tabuľku `profiles` tak, aby bolo možné vytvoriť profil aj pre Firebase používateľov (bez záznamu v `auth.users`).
2. **20260223120100_firebase_rls_use_current_profile_id.sql** – v hlavných RLS politikách nahrádza `auth.uid()` za `current_profile_id()`, aby prihlásenie cez Firebase fungovalo pri čítaní a zápise do tabuliek (profiles, memberships, businesses, services, employees, appointments, atď.).

Ak používaš ďalšie migrácie s vlastnými RLS politikami, v nich tiež nahraď `auth.uid()` za `current_profile_id()`.

## 6. Overenie

1. Nastav všetky env premenné (Firebase + Supabase).
2. Spusti aplikáciu (lokálne alebo na Vercel).
3. Na `/auth` by mali fungovať prihlásenie email/heslo a Google (ak sú v Firebase povolené).
4. Po prihlásení by mal fungovať `/admin` a ďalšie stránky (profil a memberships sa načítajú cez RPC).

## Odkazy

- [Supabase – Firebase Auth](https://supabase.com/docs/guides/auth/third-party/firebase-auth)
- [Firebase Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims)

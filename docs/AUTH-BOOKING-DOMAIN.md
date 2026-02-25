# Auth na booking.papihairdesign.sk – finálny postup

Tento dokument popisuje, ako mať prihlásenie funkčné na produkčnej doméne **https://booking.papihairdesign.sk** a čo nerobiť (napr. vkladanie konfigurácie do terminálu).

---

## Pravidlo: config.toml nepatrí do terminálu

Riadky ako `[auth]`, `site_url = "..."`, `additional_redirect_urls = [...]` sú **obsah súboru** `supabase/config.toml`, nie príkazy. Do PowerShellu sa **nevkladajú** – PowerShell by ich interpretoval ako príkazy (napr. `[auth]` ako typ .NET). Súbor `config.toml` už má sekciu `[auth]` uloženú; do terminálu sa spúšťajú len príkazy (`supabase login`, `.\supabase-push-auth-config.ps1`).

---

## api.papihairdesign.sk nie je pre tento projekt potrebné

Projekt používa **Supabase Cloud** ako backend. API je na `https://eudwjgdijylsgcnncxeg.supabase.co` (premenná `VITE_SUPABASE_URL`). Vlastnú doménu **api.papihairdesign.sk** pre nimble-agenda zakladať netreba; bude potrebná len ak pridáš vlastný backend server (napr. Node/Express) na tejto doméne.

---

## Callbacky v kóde

V `src/pages/Auth.tsx` sa používa `window.location.origin`, takže na booking.papihairdesign.sk sa správne generujú napr.:

- `https://booking.papihairdesign.sk/admin` (registrácia, OAuth)
- `https://booking.papihairdesign.sk/reset-password` (obnova hesla)

Žiadna zmena v kóde pre callbacks nie je potrebná.

---

## Kde môže byť chyba (prečo auth nefunguje)

| Možná príčina | Kde to overiť |
|---------------|----------------|
| **Supabase nemá povolenú doménu** | Dashboard → Authentication → URL Configuration: **Site URL** = `https://booking.papihairdesign.sk`, **Redirect URLs** obsahujú `https://booking.papihairdesign.sk/**` alebo aspoň `/admin`, `/auth`, `/reset-password`. |
| **Nesprávny build na produkcii** | Na serveri/hoste pre booking.papihairdesign.sk musia byť pri builde nastavené `VITE_SUPABASE_URL` a `VITE_SUPABASE_PUBLISHABLE_KEY` (hodnoty z Supabase Dashboard → Settings → API). |
| **Config push sa nevykonal** | Lokálny `supabase/config.toml` má správnu doménu, ale zmeny sa do Supabase dostanú až po `supabase config push` alebo ručnom nastavení v Dashboarde. |

---

## Odporúčaný postup (kroky až do konca)

1. **Supabase CLI (ak ešte nie je)**  
   `winget install Supabase.CLI` (na Windows; inak pozri [Supabase CLI – Install](https://github.com/supabase/cli#install-the-cli). Globálna inštalácia cez `npm install -g supabase` už nie je podporovaná.)

2. **Prihlásenie (stačí raz)**  
   V priečinku projektu: `supabase login`  
   Token z: https://supabase.com/dashboard/account/tokens

3. **Push auth konfigurácie**  
   V priečinku projektu: `.\supabase-push-auth-config.ps1`  
   Skript urobí `supabase link` (ak treba) a `supabase config push`, čím sa z `supabase/config.toml` nahrajú Site URL a Redirect URLs do Supabase.

4. **Overenie v Dashboarde**  
   Supabase → Authentication → URL Configuration: skontroluj, či je **Site URL** = `https://booking.papihairdesign.sk` a či v **Redirect URLs** je `https://booking.papihairdesign.sk/**` (alebo konkrétne cesty). Ak po pushi nie sú, doplň ich ručne a ulož.

5. **Produkčný build**  
   Over, že pri deployi booking.papihairdesign.sk sa pri builde použijú správne `VITE_SUPABASE_URL` a `VITE_SUPABASE_PUBLISHABLE_KEY` pre projekt `eudwjgdijylsgcnncxeg`.

6. **Test**  
   Otvor https://booking.papihairdesign.sk/auth, skús prihlásenie (email/heslo alebo OAuth). Ak stále zlyhá, F12 → Network: pozri, ktorý request je červený a akú odpoveď vráti (status + body).

---

## Google prihlásenie – klikací zoznam

- [ ] **1.** Otvor [Google Cloud – Credentials](https://console.cloud.google.com/apis/credentials) → vytvor projekt ak treba → **Create Credentials** → **OAuth client ID**. Ak pýta consent screen, dokonči ho (názov appky, typ External).
- [ ] **2.** Typ: **Web application**. Názov: napr. Booking. Do **Authorized redirect URIs** pridaj callback – **presne** tú URL čo ti ukáže Supabase v kroku 4 (napr. `https://XXXX.supabase.co/auth/v1/callback`). Ulož. Skopíruj **Client ID** a **Client Secret**.
- [ ] **3.** Otvor [Supabase – projekt](https://supabase.com/dashboard) → svoj projekt.
- [ ] **4.** Ľavý panel: **Authentication** → **Providers** → **Google**. Zapni Google. Do **Client IDs** vlož Client ID z Google. Do **Client Secret** vlož Secret. Skip nonce / Allow users without email nechaj vypnuté. Ulož.
- [ ] **5.** V Supabase: **Authentication** → **URL Configuration**. V **Redirect URLs** musí byť napr. `https://booking.papihairdesign.sk/**` alebo aspoň `https://booking.papihairdesign.sk/admin`. Ulož.
- [ ] **6.** Test: [booking.papihairdesign.sk/auth](https://booking.papihairdesign.sk/auth) → klik na Prihlásiť sa cez Google.
- [ ] **7. Odkaz na zásady (Google OAuth consent screen)**  
  V Google Cloud Console → **APIs & Services** → **OAuth consent screen** → pole **„Odkaz na zásady ochrany osobných údajov aplikácie“** vlož:  
  **https://booking.papihairdesign.sk/privacy**

---

## Overenie poslednej fázy

**Pred deployom:** (1) Spustiť CLI push podľa `RUN-AUTH-PUSH.txt` (v koreni projektu). (2) V Supabase Dashboard → Authentication → URL Configuration overiť Site URL a Redirect URLs. (3) Vercel → Environment Variables overiť `VITE_SUPABASE_URL` a `VITE_SUPABASE_PUBLISHABLE_KEY`. (4) Lokálne: `npm run build` a manuálny test `/auth` (email alebo Google).

**Po deployi:** (1) Build na Verceli OK. (2) Na https://booking.papihairdesign.sk otvoriť F12 → Console a overiť, že env je nastavená; (voliteľne v internom DEV/admin prostredí) použiť `/diagnostics`. (3) Kliknúť na Prihlásiť sa na `/auth` a overiť presmerovanie na `/admin`. (4) Voliteľne (iba interný DEV/admin diagnostics): `/diagnostics` – DB select, RPC a Session by mali byť OK.

---

## Súhrn

- **Terminálová chyba:** Spôsobená vložením obsahu `config.toml` do PowerShellu. Do terminálu vkladaj len príkazy.
- **api.papihairdesign.sk:** Pre tento projekt nie je potrebné; backend je Supabase.
- **Callbacky:** V kóde sú nastavené správne cez `window.location.origin`.
- **Prečo auth nefunguje:** Väčšinou chýba alebo je zlá URL konfigurácia v Supabase (Site URL + Redirect URLs) alebo zlé/chybajúce premenné pri builde. Postup: CLI push (krok 3), overenie v Dashboarde (krok 4), správny build (krok 5), potom test (krok 6).

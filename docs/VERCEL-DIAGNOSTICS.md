# Vercel – diagnostika a checklist pred/po deployi

Tento dokument obsahuje checklist na overenie konfigurácie pred a po nasadení na Vercel (databáza Supabase, auth, env premenné).

---

## Pred deployom

- [ ] V Supabase (Dashboard → **Authentication** → **URL Configuration**) sú nastavené **Site URL** a **Redirect URLs** na finálnu doménu (Vercel alebo napr. `https://booking.papihairdesign.sk`).
- [ ] Vercel projekt má v **Settings → Environment Variables** nastavené:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`  
  (hodnoty z toho istého Supabase projektu – pozri sekciu „Kde získaš hodnoty“.)
- [ ] Lokálne s `.env` funguje úvodná stránka, booking flow a prihlásenie na `/auth`.

---

## Po deployi na Verceli

- [ ] Build na Verceli prebehol úspešne.
- [ ] Na produkčnej URL v konzole prehliadača (F12 → Console) je `import.meta.env.VITE_SUPABASE_URL` nastavený (nie prázdny).
- [ ] Úvodná stránka sa načíta (LiquidPlayground).
- [ ] Stránka `/booking` načíta dáta (služby, zamestnanci) – teda DB dotazy fungujú.
- [ ] Na `/auth` prihlásenie email/heslo funguje a presmeruje podľa očakávania (napr. na `/admin`).
- [ ] Po prihlásení funguje napr. `/admin` (dashboard alebo kalendár) – teda session a ďalšie DB volania fungujú.

---

## Voliteľná diagnostická stránka

- [ ] Route `/diagnostics` (v production s `?key=diagnostics`) zobrazuje výsledky testov: jeden DB select, jeden RPC, stav auth (session áno/nie), bez vypisovania tokenov. V development je stránka dostupná vždy na `/diagnostics`.

---

## Kde získaš hodnoty

- **Supabase Dashboard** → **Settings** → **API**:
  - **Project URL** → hodnota pre `VITE_SUPABASE_URL` (napr. `https://eudwjgdijylsgcnncxeg.supabase.co`).
  - **anon public** key → hodnota pre `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Konfigurácia auth (Site URL, Redirect URLs): pozri [AUTH-BOOKING-DOMAIN.md](AUTH-BOOKING-DOMAIN.md).

---

## Ak /booking neukazuje služby (404, 400)

### A) Nesprávny Supabase projekt (env ukazuje na iný host)

Ak v konzole vidíš chyby na `dssdiqojkktzfuwoulbq.supabase.co` alebo iný host ako `eudwjgdijylsgcnncxeg.supabase.co`:

1. **Príčina:** Vercel env premenné ukazujú na nesprávny Supabase projekt.
2. **Riešenie:** Nastav v Vercel `VITE_SUPABASE_URL` a `VITE_SUPABASE_PUBLISHABLE_KEY` z projektu `eudwjgdijylsgcnncxeg` (Supabase Dashboard → Settings → API). Redeploy.

### B) Tabuľky/RPC chýbajú („Could not find the table … in the schema cache“)

Ak diagnostika hlási „Could not find the table 'public.businesses'“ alebo „Could not find the function … rpc_get_public_business_info“:

1. **Príčina:** App volá Supabase projekt, na ktorý ukazujú Vercel env premenné, ale v tom projekte nie sú spustené migrácie (tabuľky a RPC sú v projekte **eudwjgdijylsgcnncxeg** z tohto repa).
2. **Riešenie 1 – prepni env na projekt s migráciami (najrýchlejšie):**
   - Vercel → tvoj projekt → **Settings** → **Environment Variables**.
   - Nastav **VITE_SUPABASE_URL** = `https://eudwjgdijylsgcnncxeg.supabase.co`.
   - Nastav **VITE_SUPABASE_PUBLISHABLE_KEY** = hodnota **anon public** z Supabase projektu **eudwjgdijylsgcnncxeg** (Supabase Dashboard → ten projekt → Settings → API).
   - Ulož, potom **Deployments** → posledný deployment → **Redeploy**.
3. **Riešenie 2 – spusti migrácie na projekte, ktorý už používaš (napr. dssdiqojkktzfuwoulbq):** Pozri [MIGRATIONS-TERMINAL.md](MIGRATIONS-TERMINAL.md) (CLI alebo psql) alebo [MIGRATIONS-SQL-EDITOR.md](MIGRATIONS-SQL-EDITOR.md) (SQL Editor – skopíruj `supabase/migrations/run-all.sql`).
4. **Overenie:** Otvor `/diagnostics?key=diagnostics` – DB a RPC by mali byť OK. Potom `/booking` – služby sa zobrazia.

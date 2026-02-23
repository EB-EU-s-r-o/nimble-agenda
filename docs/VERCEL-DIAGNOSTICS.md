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

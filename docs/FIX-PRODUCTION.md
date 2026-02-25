# Rýchly fix: /booking neukazuje služby, diagnostika hlási chýbajúce tabuľky/RPC

## Čo urobiť (jedna z možností)

### Možnosť A: Nastaviť Vercel env na projekt s migráciami (odporúčané)

**Cez Vercel Dashboard:**  
1. Otvor **Supabase Dashboard** → projekt **eudwjgdijylsgcnncxeg** (ak ho nemáš, použij Možnosť B).  
2. **Settings** → **API**: skopíruj **anon public** key.  
3. Vercel → projekt (nimble-agenda) → **Settings** → **Environment Variables**: nastav **VITE_SUPABASE_PUBLISHABLE_KEY** = anon key z kroku 2. (VITE_SUPABASE_URL a PROJECT_ID môžeš nechať – už môžu byť nastavené cez CLI.)  
4. **Deployments** → posledný deployment → **Redeploy**.

**Cez Vercel CLI (URL už je nastavená):**  
1. Supabase → projekt **eudwjgdijylsgcnncxeg** → **Settings** → **API** → skopíruj **anon public** key.  
2. V priečinku projektu spusti (nahraď `YOUR_ANON_KEY` skutočným kľúčom):
   ```powershell
   .\scripts\set-vercel-supabase-key.ps1 -AnonKey "YOUR_ANON_KEY"
   ```
3. Redeploy:
   ```powershell
   vercel --prod
   ```

Po dokončení over env/DB/RPC cez internú diagnostics stránku v development/admin prostredí, potom na produkcii over /booking.

### Možnosť B: Spustiť migrácie na projekte, na ktorý už Vercel ukazuje

Ak vo Vercel chceš nechať aktuálny projekt (napr. **dssdiqojkktzfuwoulbq**), musíš v tom Supabase projekte vytvoriť tabuľky a RPC:

1. Otvor Supabase Dashboard → projekt **dssdiqojkktzfuwoulbq** (alebo ten, ktorý používa tvoj Vercel).
2. **SQL Editor** → New query.
3. Skopíruj celý obsah súboru **supabase/migrations/run-all.sql** z tohto repozitára a vlož do editora. Spusti (Run).
4. Po úspechu over `/booking` – služby sa majú zobraziť (diagnostics je interný DEV/admin nástroj).

Alternatíva z terminálu (ak máš heslo k DB): pozri [MIGRATIONS-TERMINAL.md](MIGRATIONS-TERMINAL.md), príkaz `.\supabase-db-push-psql.ps1 -ProjectRef dssdiqojkktzfuwoulbq`.

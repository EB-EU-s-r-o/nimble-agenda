

## Oprava chyby "supabaseUrl is required"

### Problem
Subor `.env` neexistuje v projekte. Supabase klient v `client.ts` (auto-generovany, nesmie sa editovat) cita `import.meta.env.VITE_SUPABASE_URL`, ktora je `undefined`. Hoci `vite.config.ts` obsahuje fallbacky cez `define` blok, tieto nemusia fungovat spravne v dev rezime Lovable Cloud.

### Riesenie

Jediny krok: **Obnovit `.env` subor** s korektnym obsahom:

```
VITE_SUPABASE_PROJECT_ID="eudwjgdijylsgcnncxeg"
VITE_SUPABASE_URL="https://eudwjgdijylsgcnncxeg.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1ZHdqZ2Rpanlsc2djbm5jeGVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MTI5OTAsImV4cCI6MjA4NzA4ODk5MH0.9BknkyJShiVQgTBuO-Ulx9eTgrERxxzLth0-E0_Y8IU"
```

Tieto hodnoty su verejne (anon key + project URL) a su uz hardcoded ako fallbacky vo `vite.config.ts`, takze nie je bezpecnostne riziko.

### Dolezite poznamky
- **Nebudu sa editovat** subory `client.ts`, `types.ts`, ani `config.toml` -- su auto-generovane
- **Nebudu sa menit** ziadne ine subory -- jediny problem je chybajuci `.env`
- Po vytvoreni `.env` sa Vite dev server automaticky restartuje a chyba zmizne

### Technicke detaily

Preco `define` blok vo `vite.config.ts` nestaci:
- V dev rezime Vite spracuva `import.meta.env.VITE_*` premenne cez vlastny env system, nie cez `define`
- `loadEnv()` v config subore cita `.env` subor -- ked neexistuje, `env.VITE_SUPABASE_URL` je prazdny retazec
- Fallback `||` operator by mal fungovat, ale `define` prepis `import.meta.env` v dev mode moze byt ignorovany Vite-om v prospech jeho vlastneho env systemu


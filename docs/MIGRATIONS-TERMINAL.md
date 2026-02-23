# Migrácie cez terminál

Spustenie Supabase migrácií z terminálu: primárne cez Supabase CLI (link + db push), pri chýbajúcom týmovom prístupe cez psql.

---

## Cesta A: Supabase CLI (preferovaná)

**Predpoklad:** Si v Supabase tíme (owner ťa pozval, pozvánku si prijal).

### Kroky v PowerShell

```powershell
cd C:\Users\42195\Documents\papihd-booking-22-2\doc\nimble-agenda

# 1. Prihlásenie (ak ešte nie si)
supabase login
# alebo: npx supabase login

# 2. Push migrácií (link + db push v jednom)
.\supabase-db-push.ps1
```

Skript vykoná:
1. `supabase link --project-ref eudwjgdijylsgcnncxeg` (alebo iný projekt, ak zadaš `-ProjectRef`)
2. `supabase db push` – aplikuje všetky migrácie z `supabase/migrations/` (okrem `run-all.sql`)

### Iný projekt (napr. dssdiqojkktzfuwoulbq)

```powershell
.\supabase-db-push.ps1 -ProjectRef dssdiqojkktzfuwoulbq
```

### Ak súbor `supabase` nie je v PATH

Skript automaticky použije `npx supabase` (z package.json devDependencies).

---

## Cesta B: psql (ak nemáš týmový prístup)

**Predpoklad:** Máš Database password z Supabase Dashboard (Settings → Database → Connection string).

### 1. Získaj connection string

Supabase Dashboard → **Settings** → **Database** → **Connection string** → **URI** (Direct connection).

Formát: `postgresql://postgres:[YOUR_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`

### 2. Spusti migrácie cez skript (odporúčané)

```powershell
cd C:\Users\42195\Documents\papihd-booking-22-2\doc\nimble-agenda

# Nastav heslo (neukladaj do skriptu)
$env:PGPASSWORD = "tvoje_heslo"

# Projekt eudwjgdijylsgcnncxeg (default)
.\supabase-db-push-psql.ps1

# Alebo iný projekt
.\supabase-db-push-psql.ps1 -ProjectRef dssdiqojkktzfuwoulbq
```

### 3. Alebo priamo psql

```powershell
cd C:\Users\42195\Documents\papihd-booking-22-2\doc\nimble-agenda

# Heslo cez premennú
$env:PGPASSWORD = "tvoje_heslo"
psql "postgresql://postgres@db.eudwjgdijylsgcnncxeg.supabase.co:5432/postgres" -f supabase/migrations/run-all.sql
```

**Poznámka:** `psql` musí byť nainštalovaný (PostgreSQL client). Na Windows: `winget install PostgreSQL.PostgreSQL`.

---

## Výber projektu

| Projekt | Kedy použiť |
|---------|-------------|
| `eudwjgdijylsgcnncxeg` | Ak Vercel env ukazuje na tento projekt (config.toml) |
| `dssdiqojkktzfuwoulbq` | Ak Vercel env ukazuje na tento projekt |

---

## Overenie po spustení

1. Otvor `/diagnostics?key=diagnostics` – DB a RPC by mali byť OK.
2. Otvor `/booking` – služby sa zobrazia.

---

## Zhrnutie príkazov

| Cesta | Príkazy |
|-------|---------|
| **A – CLI** | `supabase login` → `.\supabase-db-push.ps1` |
| **A – iný projekt** | `.\supabase-db-push.ps1 -ProjectRef dssdiqojkktzfuwoulbq` |
| **B – psql skript** | `$env:PGPASSWORD = "…"` → `.\supabase-db-push-psql.ps1` |
| **B – psql priamo** | `psql "postgresql://postgres@db.[PROJECT_REF].supabase.co:5432/postgres" -f supabase/migrations/run-all.sql` |

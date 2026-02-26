# Kde ukladať údaje a kľúče (Supabase a projekt)

Tento projekt používa premenné prostredia – názvy a príklady sú v [.env.example](../.env.example). Skutočné hodnoty **nikdy** necommituj do gitu.

## Čo kam ukladať

| Čo | Kde to nájdeš | Kde to uložiť |
|----|----------------|----------------|
| **Publishable Key** | Supabase Dashboard → projekt → Settings → API | Lokálne `.env` (`VITE_SUPABASE_PUBLISHABLE_KEY`), Vercel/Firebase Hosting → Environment Variables |
| **Anon Key (Legacy)** | To isté, sekcia Anon Key (Legacy) | Alternatíva k Publishable Key – ak klientsky kód vyžaduje JWT, použiť v `.env` a na hostingu |
| **Service Role Key** | Settings → API (secret) | Nikdy do frontendu ani do `.env` v repozitári; len Edge Functions secrets / backend env |
| **Database password** | Settings → Database (connection string) | Password manager; lokálne napr. `SUPABASE_DB_URL` len ak potrebuješ migrácie |
| **SUPABASE_ACCESS_TOKEN** | Supabase Dashboard → Account → Access Tokens | Ak používaš CLI (link, db push); do password manager a lokálne `.env` |

## Priame pripojenie k DB (projekt hrkwqdvfeudxkqttpgls)

- **Host:** `db.hrkwqdvfeudxkqttpgls.supabase.co`
- **Port:** 5432  
- **Database:** postgres  
- **User:** postgres  
- **Connection string:** `postgresql://postgres:[YOUR-PASSWORD]@db.hrkwqdvfeudxkqttpgls.supabase.co:5432/postgres`  

Heslo si ulož len v password manageri a v lokálnom `.env` ako `SUPABASE_DB_URL` (ak potrebuješ migrácie cez psql alebo CLI).

## Hosting (Vercel, Firebase Hosting, iné)

V nastaveniach projektu nastav **Environment Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (a voliteľne `VITE_SUPABASE_PROJECT_ID`). Hodnoty zober z [Supabase Dashboard](https://supabase.com/dashboard) → tvoj projekt → Settings → API. Na serveri sa `.env` z tohto repozitára nepoužíva.

## Odkazy

- **Premenné v projekte:** [.env.example](../.env.example)
- **README – premenné prostredia:** [README.md#premenné-prostredia](../README.md#premenné-prostredia)
- **Supabase Dashboard:** https://supabase.com/dashboard

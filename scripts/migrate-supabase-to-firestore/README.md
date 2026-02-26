# Migrácia Supabase → Firestore

## Predpoklady

- Node 18+
- Supabase projekt: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (pre export)
- Firebase projekt (phd-booking): service account v `GOOGLE_APPLICATION_CREDENTIALS` alebo `gcloud auth application-default login` (pre import)

## Kroky

### 1. Export z Supabase

```bash
cd scripts/migrate-supabase-to-firestore
npm install
export SUPABASE_URL="https://xxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
npx tsx export-supabase.ts
```

Výstup: `export/*.json` (jeden súbor na tabuľku).

### 2. Transformácia a import do Firestore

```bash
npx tsx transform-and-import.ts
```

Načíta `export/*.json`, transformuje dáta (memberships → doc id `profile_id_business_id`), zapíše do Firestore v dávkach po 500.

### 3. Jednorazový beh (export + import)

```bash
npx tsx run-migration.ts
```

Spustí export a potom transform-and-import (vyžaduje nastavené obe premenné Supabase aj Firebase).

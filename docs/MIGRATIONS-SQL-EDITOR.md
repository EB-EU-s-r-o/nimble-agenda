# Migrácie cez Supabase SQL Editor

Ak `supabase link` zlyhá s „Your account does not have the necessary privileges“, môžeš migrácie spustiť manuálne v **Supabase Dashboard → SQL Editor**. Alternatíva z terminálu (CLI alebo psql): [MIGRATIONS-TERMINAL.md](MIGRATIONS-TERMINAL.md).

## Postup

1. Otvor Supabase Dashboard projektu, na ktorý ukazuje app (napr. `dssdiqojkktzfuwoulbq` alebo `eudwjgdijylsgcnncxeg`).
2. Choď do **SQL Editor**.
3. Spusti súbor `supabase/migrations/run-all.sql` (alebo jednotlivé migrácie v poradí).

## Poradie migrácií

Spúšťaj v tomto poradí (podľa timestampu v názve):

| # | Súbor |
|---|-------|
| 1 | `20260219160842_ac587df3-28ee-419c-b19e-a20eddc1098d.sql` |
| 2 | `20260219160855_7d635dc8-6aed-4db8-bc06-026d4e6ea691.sql` |
| 3 | `20260219224051_e1d70956-8ab7-40c3-a5cb-cdcde24497f6.sql` |
| 4 | `20260220003845_7a285cb4-3c4a-469f-abc5-32a95ea67b0a.sql` |
| 5 | `20260220005009_a027e183-b7b6-4e34-a80c-bd2865f801ce.sql` |
| 6 | `20260220025406_286a15d3-aed0-467d-bf07-59ecdd79d085.sql` |
| 7 | `20260220050115_51f6eb5c-f56a-4d99-8a2f-6c262b27c0b5.sql` |
| 8 | `20260220105404_3bf49543-2aff-44be-850e-8f3eac89a658.sql` |
| 9 | `20260220135634_16f3912b-3a74-4c4d-99fe-881ceb1d782e.sql` |
| 10 | `20260220160350_2db5ad0e-6d05-42f3-8a7b-5eca1d0856a2.sql` |
| 11 | `20260221010322_2c0e2b4e-2988-4225-9d81-7eb1debde20a.sql` |
| 12 | `20260221031715_d2d16bb1-eefe-41f9-9fc7-2d80211c9f0d.sql` |
| 13 | `20260222180000_employee_services.sql` |

## Alternatíva: jeden súbor

Súbor `supabase/migrations/run-all.sql` obsahuje všetky migrácie zlúčené v správnom poradí. Skopíruj jeho obsah do SQL Editora a spusti.

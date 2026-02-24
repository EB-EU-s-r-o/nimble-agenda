# Vetvy a deploy na Vercel

## Rozdelenie vetiev

| Vetva | Účel |
|-------|------|
| **main** | Vývoj a integrácia. Používa sa pre Lovable – všetky zmeny z Lovable idú sem. |
| **papihairstudiobooking** | Produkčná vetva pre Vercel. Z tejto vetvy Vercel deployuje production. |

## Nastavenie Vercel (jednorazové, ručné)

Vercel neberie production branch z kódu; nastavuje sa v Dashboard:

1. Otvor **Vercel Dashboard** → váš projekt (nimble-agenda / booking).
2. **Settings** → **Git**.
3. Nájdite **Production Branch** (alebo „Deploy from branch“).
4. Zmeňte z `main` na **papihairstudiobooking** a uložte.

Od tohto momentu platí:

- **Production deploy** = push alebo merge do `papihairstudiobooking`.
- **Preview deployy** = ostatné vetvy / Pull Requesty podľa nastavenia projektu.

## Bežný workflow – nasadenie na Vercel

Keď chcete dostať zmeny z Lovable (main) do produkcie:

1. **Lokálne (príklad):**
   ```bash
   git checkout papihairstudiobooking
   git pull origin papihairstudiobooking
   git merge main
   git push origin papihairstudiobooking
   ```

2. **Alebo cez GitHub:**  
   Vytvorte **Pull Request** z `main` do `papihairstudiobooking`, schválte a zlúčte. Vercel po merge automaticky spustí production deploy.

Po pushi alebo merge do `papihairstudiobooking` Vercel nasadí novú verziu na production doménu.

## CI (GitHub Actions)

CI beží na vetvách **main**, **uprava22-2** a **papihairstudiobooking** (lint, test, build). Push do `papihairstudiobooking` teda spustí kontrolu pred tým, ako Vercel deployuje.

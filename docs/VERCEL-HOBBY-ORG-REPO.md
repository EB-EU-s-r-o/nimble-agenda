# Obchádzanie limitu Vercel Hobby (private org repo)

## Problém

- **Vercel Hobby** nepodporuje deploy zo súkromného repozitára **vlastneného organizáciou** (napr. `EB-EU-s-r-o/nimble-agenda`).
- Pri pripájaní takého repa pod osobný účet (napr. h4ck3d@h4ck3d.me) Vercel zobrazí: *"The repository is private and owned by an organization, which is not supported on the Hobby plan."*
- Riešenie: mať repozitár pod **osobným účtom** (user), nie pod organizáciou – potom ho Hobby zvládne.

---

## Dve možnosti

| Možnosť | Kedy použiť |
|--------|---------------|
| **A – Prevod** | Máš admin na org repozitári; chceš jeden repozitár, len zmena vlastníctva. |
| **B – Nové osobné repo** | Nemáš admin alebo firma nechce prevod; vytvoríš vlastné repo a pushneš kód. |

---

## Možnosť A: Previesť repozitár z organizácie na osobný účet

**Podmienka:** Admin práva na repozitári v organizácii (alebo owner organizácie).

### 1. Previesť repo (GitHub)

- **V prehliadači:** Repo → **Settings** → **Danger Zone** → **Transfer ownership** → zadaj GitHub **username** osobného účta → potvrdenie.
- **Cez API** (token s právami org admin):

```bash
gh api -X POST /repos/EB-EU-s-r-o/nimble-agenda/transfer -f new_owner=TVOJ_GITHUB_USERNAME
```

- Pri prevode na **user** musí nový vlastník do cca 24 h **potvrdiť** prevod (email od GitHubu).

### 2. Po prevode: Git a Vercel

- Repo bude pod `TVOJ_GITHUB_USERNAME/nimble-agenda`. V priečinku projektu:
  - uprav `origin`:  
    `git remote set-url origin https://github.com/TVOJ_GITHUB_USERNAME/nimble-agenda.git`
  - alebo znova naklonuj z nového repa.
- **Vercel:** Existujúci projekt je viazaný na pôvodnú org repo. Prepoj na novú:
  - **Dashboard:** Vercel → projekt **nimble-agenda** → **Settings** → **Git** → **Disconnect** → **Connect Git Repository** → vyber `TVOJ_GITHUB_USERNAME/nimble-agenda`.
  - **CLI:** V priečinku (s `origin` na nové repo) spusti `vercel link` a zvoľ existujúci projekt.

### 3. Výsledok

- Repo je pod tvojím účtom, Vercel Hobby ho zobrazí a deploy funguje. Firmu môžeš pridať ako **collaborators** na Git repozitár.

---

## Možnosť B: Nové osobné repo (bez prevodu)

Ak nemáš admin na org repozitári alebo nechceš meniť vlastníctvo pôvodného repa.

### 1. Nové repo pod osobným účtom

- Cez **GitHub CLI** (prihlásený pod osobným účtom):

```bash
gh repo create nimble-agenda --private --source=. --remote=myorigin --push
```

- Alebo na GitHub cez UI vytvor nový súkromný repozitár, potom v priečinku projektu:

```bash
git remote add myorigin https://github.com/TVOJ_USER/nimble-agenda.git
git push myorigin main
```

(Prípadne `master` alebo názov tvojej default branch.)

### 2. Vercel: nový projekt

- V **Vercel Dashboard** vytvor nový projekt a pripoj repozitár `TVOJ_USER/nimble-agenda`.
- Na PC v priečinku projektu:

```bash
vercel link
```

Zvoľ nový projekt.

### 3. Env premenné

- Nový Vercel projekt nemá env z pôvodného. Nastav znova:
  - **VITE_SUPABASE_URL** = `https://eudwjgdijylsgcnncxeg.supabase.co`
  - **VITE_SUPABASE_PROJECT_ID** = `eudwjgdijylsgcnncxeg`
  - **VITE_SUPABASE_PUBLISHABLE_KEY** = anon key z Supabase (projekt eudwjgdijylsgcnncxeg → Settings → API).

  Cez CLI môžeš použiť skript [../scripts/set-vercel-supabase-key.ps1](../scripts/set-vercel-supabase-key.ps1) pre anon key; URL a PROJECT_ID cez Dashboard alebo `vercel env add`.

---

## Pomocné skripty v tomto repozitári

- **Možnosť A (po prevode):** [../scripts/vercel-hobby-after-transfer.ps1](../scripts/vercel-hobby-after-transfer.ps1) – nastaví `origin` na nové repo a vypíše kroky pre Vercel.
- **Možnosť B:** [../scripts/vercel-hobby-new-personal-repo.ps1](../scripts/vercel-hobby-new-personal-repo.ps1) – pridá remote a pushne aktuálnu vetvu, potom inštrukcie pre Vercel.

---

## Shrnutie

| Krok | Možnosť A (prevod) | Možnosť B (nové repo) |
|------|--------------------|------------------------|
| 1 | GitHub: Transfer ownership (UI alebo `gh api ... /transfer`) na tvoj user | `gh repo create` alebo UI – nové súkromné repo |
| 2 | Potvrdiť prevod (email) | `git remote add` + `git push` do nového repa |
| 3 | `git remote set-url origin` na nové URL alebo re-clone | – |
| 4 | Vercel: Settings → Git → Disconnect → Connect **nové** repo | Vercel: nový projekt + Connect tvoje nové repo |
| 5 | (Voliteľne) `vercel link` v priečinku s novým origin | `vercel link` → zvoliť nový projekt |
| 6 | Env (ak si vytvoril nový projekt) | Nastaviť env (VITE_SUPABASE_*, skript pre anon key) |

**Vlastníctvo repa meníš v GitHub (transfer alebo nové repo). Vercel potom len prepojíš na repo pod tvojím účtom.**

# Príprava prostredia a vývoj – Nimble Agenda

Návod na prvotný setup, prípravu na nový vývoj (po clone alebo po `git pull`) a riešenie bežných problémov.

---

## Obsah

- [Požiadavky](#požiadavky)
- [Prvotný setup (nový clone)](#prvotný-setup-nový-clone)
- [Príprava na nový vývoj (existujúci projekt)](#príprava-na-nový-vývoj-existujúci-projekt)
- [Package manager: npm vs pnpm](#package-manager-npm-vs-pnpm)
- [Riešenie problémov](#riešenie-problémov)
- [Súvisiace dokumenty](#súvisiace-dokumenty)

---

## Požiadavky

- **Node.js 18+** (odporúčané LTS)
- **Git**
- **Package manager:** npm (súčasť Node.js) alebo [pnpm](https://pnpm.io/) – v jednom clone používaj **iba jeden**

---

## Prvotný setup (nový clone)

```powershell
# 1. Klonovanie
git clone https://github.com/EB-EU-s-r-o/nimble-agenda.git
cd nimble-agenda

# 2. Automatická príprava (Node.js check + npm install + .env z .env.example)
npm run setup
# alebo priamo:
.\setup.ps1

# 3. Ak používaš pnpm, ešte:
pnpm install

# 4. Doplň .env (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
# 5. Spusti vývoj
npm run dev   # alebo: pnpm dev
```

Aplikácia: **http://localhost:8080**

---

## Príprava na nový vývoj (existujúci projekt)

Keď sa vrátiš k projektu alebo potiahneš najnovšie zmeny z repozitára:

| Krok | Príkaz (npm) | Príkaz (pnpm) |
|------|--------------|----------------|
| 1. Stiahnuť zmeny | `git pull origin main` | to isté |
| 2. Závislosti | `npm run setup` alebo `npm install` | `pnpm install` |
| 3. Overiť .env | Skontrolovať `.env` (Supabase) | to isté |
| 4. Lint | `npm run lint` | `pnpm lint` |
| 5. Testy | `npm run test` | `pnpm test` |
| 6. Build | `npm run build` | `pnpm build` |
| 7. Dev server | `npm run dev` | `pnpm dev` |

Všetko prebehne bez chýb = prostredie je pripravené na ďalší vývoj.

---

## Package manager: npm vs pnpm

### Pravidlo: jeden package manager na jeden clone

- **Nemiešaj** v tom istom priečinku `npm install` a `pnpm install`. Každý manager má vlastný layout `node_modules` (pnpm používa symlinky a vlastný store).
- Ak spúšťaš príkazy cez **pnpm** (`pnpm test`, `pnpm run dev`), závislosti musia byť nainštalované cez **pnpm** – teda aspoň raz spusti `pnpm install`.

### Prečo „Vitest not found“ pri pnpm?

Rozšírenie Vitest v Cursor/VS Code alebo priame volanie `pnpm test` hľadá binárku `vitest` v `node_modules/.bin`. Tá sa tam dostane až po inštalácii závislostí **tým istým** package managerom, akým spúšťaš skripty:

- Projekt bol pripravený cez `npm run setup` (volá `npm install`) → `node_modules` má npm štruktúru.
- Keď potom spustíš `pnpm test`, pnpm môže očakávať svoj vlastný strom (ak si predtým nikdy nespustil `pnpm install`), a binárka `vitest` nie je nájdená.

**Riešenie:** V koreni projektu spusti `pnpm install`. Potom `pnpm test` (a ostatné `pnpm run …`) budú fungovať.

### Setup.ps1 a pnpm

Skript `setup.ps1` **automaticky detekuje pnpm**: ak je `pnpm` v PATH, spustí `pnpm install`, inak `npm install`. Po `.\setup.ps1` už nemusíš nič meniť – ďalej používaj ten istý package manager (pnpm alebo npm) pri `pnpm test` / `npm run test`, `pnpm dev` / `npm run dev` atď.

---

## Riešenie problémov

### „vitest is not recognized“ / „Vitest not found“

- **Používaš pnpm:** Spusti v koreni projektu `pnpm install`. Potom `pnpm test`.
- **Používaš npm:** Spusti `npm install` (alebo `npm run setup`). Potom `npm run test`.
- V IDE (Vitest extension): over, že project root je `nimble-agenda` a že závislosti sú nainštalované tým package managerom, ktorý v projekte používaš.

### Node.js verzia

- Minimálna požiadavka: Node.js 18.  
- Skontrolovať: `node -v`.  
- Odporúčané: LTS (20 alebo 22).

### Závislosti sa neinštalovali

- Skontroluj sieť / proxy.  
- Skús vymazať `node_modules` a lockfile (iba ten, ktorý používaš):  
  - pri npm: zmaž `node_modules` a `package-lock.json`, potom `npm install`;  
  - pri pnpm: zmaž `node_modules` a `pnpm-lock.yaml`, potom `pnpm install`.

### Build / test zlyháva

- `npm run lint` alebo `pnpm lint` – overenie kódu  
- `npm run test` alebo `pnpm test` – unit testy  
- `npm run build` alebo `pnpm build` – overenie produkčného buildu  

Chyby z týchto príkazov treba odstrániť pred commitom.

---

## Súvisiace dokumenty

- [README.md](../README.md) – rýchly štart, príkazy, premenné prostredia
- [ARCHITECTURE.md](ARCHITECTURE.md) – technická architektúra
- [AUTH-BOOKING-DOMAIN.md](AUTH-BOOKING-DOMAIN.md) – auth na produkčnej doméne
- [scripts/README.md](../scripts/README.md) – Vercel deploy skripty (build sa volá cez `npm run build`; pri pnpm použite `pnpm run build`)

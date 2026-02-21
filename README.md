# PAPI HAIR DESIGN – Booking System

Moderný rezervačný systém pre salóny krásy. React PWA + Lovable Cloud backend.

## 🏗 Architektúra

```
React 18 + Vite + TypeScript
├── shadcn/ui + Tailwind CSS (UI)
├── framer-motion (animácie)
├── Dexie.js (offline-first)
├── vite-plugin-pwa (PWA)
└── Lovable Cloud (DB, Auth, Edge Functions, RLS)
```

## 👥 Demo účty

| Rola | Email | Heslo | Prístup |
|------|-------|-------|---------|
| Zákazník | `demo@papihairdesign.sk` | `PapiDemo2025!` | `/booking` – rezervácie, história |
| Majiteľ / Admin | `owner@papihairdesign.sk` | `PapiDemo2025!` | `/admin` – kalendár, zamestnanci, služby, štatistiky |
| Superadmin | `larsenevans@proton.me` | *kontaktujte nás* | Plný prístup, multi-business správa |

## 🔄 Ako funguje systém

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Zákazník   │────▶│  /booking    │────▶│  Vytvorí      │
│  (telefón)  │     │  vyberie     │     │  rezerváciu   │
└─────────────┘     │  termín      │     └──────┬───────┘
                    └──────────────┘            │
                                               ▼
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Admin      │◀────│  Kalendár    │◀────│  Notifikácia │
│  (dashboard)│     │  sa aktualizuje│    │  e-mailom    │
└─────────────┘     └──────────────┘     └──────────────┘
```

1. **Zákazník** otvorí `/booking`, vyberie službu, zamestnanca a termín
2. **Systém** vytvorí rezerváciu, pošle e-mail potvrdenie
3. **Admin** vidí nový termín v kalendári, môže potvrdiť/zrušiť
4. **Zamestnanec** vidí svoj rozvrh v `/admin/my`

## 📱 Hlavné funkcie

- **Online rezervácie 24/7** – zákazník si rezervuje kedykoľvek
- **Správa zamestnancov** – rozvrhy, profily, služby
- **Multi-tenant** – jeden systém pre viacero prevádzok
- **Offline-first** – funguje aj bez internetu (Dexie.js + sync)
- **PWA** – inštalácia na telefón jedným kliknutím
- **Automatické notifikácie** – e-mail pripomienky
- **RLS bezpečnosť** – izolácia dát podľa business_id

## 🚀 Rýchly štart

```sh
git clone <repo-url>
cd <project>
npm install
npm run dev
```

Premenné prostredia sa nastavujú automaticky cez Lovable Cloud.

## 📂 Štruktúra

```
src/
├── pages/           # Stránky (Auth, Booking, Admin, Demo...)
├── components/      # UI komponenty
├── contexts/        # AuthContext
├── hooks/           # Custom hooks (useBusiness, useAuth...)
├── lib/             # Utility funkcie, offline sync
└── integrations/    # Lovable Cloud klient

supabase/
└── functions/       # Edge Functions (booking, sync, auth...)
```

## 🔒 Bezpečnosť

- Row Level Security (RLS) na všetkých tabuľkách
- Multi-tenant izolácia cez `business_id`
- Passkeys (WebAuthn) podpora
- SMTP credentials v edge function secrets

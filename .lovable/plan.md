# Plan: Demo ucty, prava a prezentacna landing page

## Situacia

Aktualne v databaze:

- Business "PAPI HAIR DESIGN" existuje (ID: `a1b2c3d4-...0001`, onboarding hotovy)
- Tvoj profil (`larsenevans@proton.me`) existuje, ale **nema ziadny membership** - preto nemas pristup do adminu
- Tabulka `user_roles` je prazdna
- Tabulka `memberships` je prazdna
- Demo zakaznik este neexistuje

## Co treba spravit

### 1. Vytvorit ucty a pridelit prava

**a) Superadmin ([larsenevans@proton.me](mailto:larsenevans@proton.me))**

- Uz existuje v `profiles` (ID: `e7375c3d-...`)
- Pridat do `memberships` s rolou `owner` pre PAPI HAIR DESIGN
- Pridat do `user_roles` s rolou `admin` (systemova uroven)

**b) Majitel salonu (booking.papihairdesign.sk)**

- Treba vytvorit novy ucet cez auth (email podla tvojho vstupu - aky email ma mat majitel salonu?)
- Pridat do `memberships` s rolou `owner` alebo `admin`

**c) Demo zakaznik ([demo@papihairdesign.sk](mailto:demo@papihairdesign.sk))**

- Vytvorit novy ucet cez auth
- Pridat do `customers` tabulky
- Pridat do `memberships` s rolou `customer`

### 2. Vytvorit Demo/Landing stranka (`/demo`)

Nova stranka, ktora bude sluzit ako **prezentacia systemu** pre potencialnych zakaznikov (majitelov salonov). Obsahuje:

- **Hero sekcia** - nadpis, kratky popis booking systemu
- **3 demo ucty** s prihlasovacimi udajmi (email + heslo) a popisom co kazdy vidi
- **Navod ako funguje system** - strucne kroky:
  1. Zakaznik si rezervuje termin cez `/booking`
  2. Salon dostane notifikaciu + termin sa objavi v kalendari
  3. Admin spravuje rezervacie, zamestnancov, sluzby a nastavenia
  4. Zamestnanec vidi svoj rozvrh a moze spravovat svoje terminy
- **3 tlacidla** na priame prihlasenie do kazdeho uctu

### 3. Aktualizovat README.md

Pridat podrobny popis systemu a navod.

### 4. Tri napady na prezentaciu

1. **Interaktivny "Try it yourself" demo** - Na landing page 3 karty (Zakaznik / Majitel / Zamestnanec). Kliknutim sa prihlasis rovno do daneho uctu a vidis presne co vidi dana rola. Ziadna registracia, okamzity zazitok.
2. **Split-screen video/GIF walkthrough** - Lava strana ukazuje co robi zakaznik (booking flow), prava strana ukazuje co vidi admin v realnom case. Wow efekt - "pozrite sa, rezervacia sa objavi okamzite."
3. **QR kod na stole v salone** - Fyzicky QR kod ktory vedie na `/booking`. Zakaznik si priamo z telefonu rezervuje nasledujucu navstevu kym sedi v kresle. Zero friction.

---

## Technicke detaily

### Databazove zmeny (migration + data insert)

```sql
-- Pridelit larsenevans@proton.me ako owner
INSERT INTO memberships (profile_id, business_id, role)
VALUES ('e7375c3d-7d3a-46e2-9783-f4e5e8919091', 'a1b2c3d4-0000-0000-0000-000000000001', 'owner');

-- Pridat systemovu rolu admin
INSERT INTO user_roles (user_id, role)
VALUES ('e7375c3d-7d3a-46e2-9783-f4e5e8919091', 'admin');
```

Demo ucty sa vytvoria cez edge function (kvoli auth.users), ktora:

- Vytvori 2 nove ucty (majitel salonu + demo zakaznik) s preddefinovanymi heslami
- Priradi im memberships a profile data

### Nove subory


| Subor                                            | Ucel                                                |
| ------------------------------------------------ | --------------------------------------------------- |
| `src/pages/DemoPage.tsx`                         | Landing/prezentacna stranka s demo uctami a navodom |
| `supabase/functions/seed-demo-accounts/index.ts` | Jednorazova edge function na vytvorenie demo uctov  |


### Upravene subory


| Subor         | Zmena                           |
| ------------- | ------------------------------- |
| `src/App.tsx` | Pridat route `/demo`            |
| `README.md`   | Kompletny popis systemu + navod |


### Otazka pred implementaciou

Potrebujem vediet:

- Aky **email** ma mat ucet majitela salonu? (napr. `admin@papihairdesign.sk`?)
- Ake **heslo** chces pre demo ucty? (napr. `Demo123!` p

&nbsp;

######### !!!!!!!!!!

&nbsp;

Ja navrhujem toto a ked tak ma poupravuj

&nbsp;

# Lovable Setup – Brutálny plán 🔥

## Odpovede na otázky pred implementáciou

Navrhované hodnoty – potvrď alebo uprav:

- **Majiteľ salónu:** booking`@papihairdesign.sk`

- **Demo heslo pre všetky účty:** `PapiDemo2025!`

---

## Stratégia pre Lovable

Lovable má špecifické obmedzenia – treba to robiť v správnom poradí, inak to padne.

### 🔴 Krok 1 – SQL migrácia cez Supabase dashboard (NIE cez Lovable)

Toto urob **priamo v Supabase SQL Editor**, nie cez Lovable prompt – Lovable občas pokazí manuálne SQL:

```sql

-- 1. Superadmin membership

INSERT INTO memberships (profile_id, business_id, role)

VALUES (

  'e7375c3d-7d3a-46e2-9783-f4e5e8919091',

  'a1b2c3d4-0000-0000-0000-000000000001',

  'owner'

) ON CONFLICT DO NOTHING;

-- 2. Systemova rola admin

INSERT INTO user_roles (user_id, role)

VALUES (

  'e7375c3d-7d3a-46e2-9783-f4e5e8919091',

  'admin'

) ON CONFLICT DO NOTHING;

```

---

### 🟡 Krok 2 – Edge Function pre demo účty

Lovable prompt (skopíruj presne):

```

Create a Supabase Edge Function at supabase/functions/seed-demo-accounts/index.ts

This function should:

1. Use supabaseAdmin (service role key) to create two auth users:

   - email: [owner@papihairdesign.sk](mailto:owner@papihairdesign.sk), password: PapiDemo2025!, email_confirm: true

   - email: [demo@papihairdesign.sk](mailto:demo@papihairdesign.sk), password: PapiDemo2025!, email_confirm: true

2. For [owner@papihairdesign.sk](mailto:owner@papihairdesign.sk):

   - Insert into profiles (id, email, full_name) 

   - Insert into memberships with role 'admin' for business_id 'a1b2c3d4-0000-0000-0000-000000000001'

3. For [demo@papihairdesign.sk](mailto:demo@papihairdesign.sk):

   - Insert into profiles

   - Insert into customers table

   - Insert into memberships with role 'customer' for business_id 'a1b2c3d4-0000-0000-0000-000000000001'

4. Return JSON with created user IDs and status

5. Add idempotency - if users already exist, skip and return success

Use SUPABASE_SERVICE_ROLE_KEY from env vars. Protect with a secret header X-Seed-Secret.

```

---

### 🟢 Krok 3 – DemoPage – Lovable prompt

```

Create src/pages/DemoPage.tsx with a stunning glassmorphism landing page for the PAPI HAIR DESIGN booking system demo.

Design requirements:

- Dark background: #0a0a0f with animated gradient orbs (purple/violet #7c3aed, pink #ec4899)

-  cards: backdrop-filter blur(20px), semi-transparent white borders

- Smooth entrance animations with framer-motion (stagger children)

- Fully responsive, mobile-first

Page sections:

1. HERO SECTION

- Logo/brand mark (scissors icon from lucide-react)

- Headline: "Rezervačný systém pre moderné salóny"

- Subheadline: "Vyskúšajte PAPI booking system naživo – žiadna registrácia"

- Two CTA buttons: "Vyskúšať demo" (scrolls down) + "Rezervovať termín →" (links to /booking)

2. DEMO ACCOUNTS SECTION (3 cards in a row, mobile: stacked)

Each card has:

- Role icon (User/Shield/Scissors from lucide-react)

- Role name with colored badge

- Email + password displayed with copy-to-clipboard button

- "Prihlásiť sa" button that navigates to /auth?redirect=/dashboard with pre-filled email

Card 1 – Zákazník 👤

  email: [demo@papihairdesign.sk](mailto:demo@papihairdesign.sk) | password: PapiDemo2025!

  badge color: blue

  description: "Vidíte booking flow, históriu rezervácií a profil zákazníka"

  redirect: /booking

Card 2 – Majiteľ / Admin 🛡️  

  email: [owner@papihairdesign.sk](mailto:owner@papihairdesign.sk) | password: PapiDemo2025!

  badge color: violet

  description: "Spravujete kalendár, zamestnancov, služby a štatistiky"

  redirect: /dashboard

Card 3 – Superadmin 👑

  email: [larsenevans@proton.me](mailto:larsenevans@proton.me) | password: (show "Kontaktujte nás")

  badge color: amber

  description: "Plný prístup k systému, multi-business správa"

  redirect: /dashboard

3. HOW IT WORKS (3 steps with connecting line)

Step 1: Zákazník si otvorí /booking a vyberie termín

Step 2: Salón dostane notifikáciu, termín sa zapíše do kalendára

Step 3: Admin spravuje všetko z dashboardu v reálnom čase

4. FEATURES GRID (6 cards, 2x3 grid)

- 📅 Online rezervácie 24/7

- 👥 Správa zamestnancov

- 📊 Štatistiky a prehľady  

- 🔔 Automatické notifikácie

- 📱 PWA – funguje ako app

- 🔒 Bezpečné a spoľahlivé

5. QR CODE SECTION

- Show a placeholder QR code card

- Text: "Fyzický QR kód na stole – zákazník si rezervuje kým sedí"

- Use a QR placeholder image or generate via [api.qrserver.com](http://api.qrserver.com) for URL /booking

6. FOOTER

- "Vyvinuté s ❤️ pre slovenské salóny"

```

---

### 🔵 Krok 4 – Route + Navbar

```

Add route /demo pointing to DemoPage in App.tsx.

Add "Demo" link in the main navigation.

```

---

### 🔵 Krok 5 – README update

```

Update [README.md](http://README.md) with:

- System overview (booking system for Slovak hair salons)

- Architecture: React PWA + Supabase + Edge Functions

- Demo accounts table with roles and access levels  

- Setup instructions: npm install, env vars, supabase migration, edge function deploy

- User flow diagrams in text/ASCII

```

---

## 🔐 Bezpečnosť – čo je dôležité

| Riziko | Riešenie |

|--------|----------|

| Demo heslo je verejné | Demo účty majú `customer/admin` rolu len pre 1 business – nemôžu škodiť |

| Edge function zneužitie | Chrán ju hlavičkou `X-Seed-Secret` = náhodný UUID |

| Service role key | Nikdy v klientskom kóde – len v edge function env vars |

| Superadmin email na demo stránke | Nezobrazuj heslo, len "Kontaktujte nás" |

---

## Odporúčané poradie

```

1. SQL Editor (Supabase) → memberships + user_roles

2. Lovable → Edge Function prompt

3. Supabase dashboard → Deploy + spusti edge function raz

4. Lovable → DemoPage prompt  

5. Lovable → Route + README

6. Test všetkých 3 rolí

&nbsp;
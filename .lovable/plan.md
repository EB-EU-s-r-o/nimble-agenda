

# Kompletny dizajnovy refaktor -- zladenie s papihairdesign.sk

## Prehlad

Cielom je vizualne zladit celu aplikaciu s oficialnym webom papihairdesign.sk. Web pouziva tmavu, luxusnu estetiku s vyraznymi zlatymi akcentmi, drevenym pozadim, a elegantnou typografiou. Sucasna aplikacia pouziva fialovu (purple) temu, ktora neladí s identitou znacky.

## Dizajnova analyza webu papihairdesign.sk

Klucove vizualne prvky z webu:
- **Farby**: Tmave pozadie (takmer cierne), zlata (#DAA520 / #B8860B) ako primarny akcent, biely text na tmavom pozadi
- **Typografia**: Elegantny serif pre logo "PAPI Hair DESIGN", clean sans-serif pre texty
- **Pozadie**: Tmave drevo / luxusny interier s Gold Haircare produktmi
- **Styl**: Premium, luxusny, minimalisticky -- nie hravy, nie korporatny
- **Logo**: "PAPI" v caps + kurzivne "Hair" + "DESIGN" v caps s rokom "2018"
- **CTA tlacidla**: Zlate s bielym textom, zaoblene

## Zmeny podla oblasti

### 1. Farebna tema (src/index.css + tailwind.config.ts)

Nahradenie fialovej (purple 265) za zlatu/cierno-zlatu paletu:

- `--primary`: Zmena z fialovej na zlatu (43 74% 52%)
- `--primary-foreground`: Biela (zostava)
- `--background` (light): Tepla krémova (#FAF8F5)
- `--background` (dark): Hlboka cierna (20 15% 6%)
- `--card` (dark): Tmave drevo-inspirovane (20 12% 10%)
- `--accent`: Tlmena zlata miesto fialovej
- `--ring`: Zlata
- `--sidebar-background`: Cierna s warmtone (20 20% 8%)
- `--sidebar-primary`: Zlata
- `--sidebar-accent`: Tmava zlata/hneda

### 2. Landing page (src/pages/LiquidPlayground.tsx)

- Zmena ikony Scissors za logo-ikonku znacky alebo stylizovany text "PAPI"
- Aktualizacia textu "Hair Studio & Barber" -> presny text z webu
- Pridanie tagu "Ambasador GOLD Haircare Slovakia"
- CTA "Rezervovat termin" -- zlatý gradient zostava (uz ladí)
- Liquid Glass okna -- aktualizacia title bar farieb na tmavejsie s gold akcentmi

### 3. Liquid Glass CSS (src/styles/liquid-glass.css)

- Title bar: Zmena z rgba(235,235,235,0.85) na tmavejsi (rgba(30,28,25,0.9)) s gold textom
- Content area: Zmena z rgba(255,255,255,0.66) na rgba(20,18,15,0.7) s bielym textom
- Border: Zmena z bielej na gold/amber (rgba(218,165,32,0.2))
- Gradient pozadie -- teplejsie tony (warm black, nie cold blue-purple)

### 4. Auth stranka (src/pages/Auth.tsx)

- Gradient pozadie: Zmena z `from-secondary to-background` na tmave luxusne pozadie
- Logo: Zlaty kruh/stvorcek miesto fialoveho
- Card: Tmava karta s gold akcentmi
- Nazov "Papi Hair" -> "PAPI HAIR DESIGN"

### 5. Booking page -- Desktop (src/pages/BookingPage.tsx)

- Header: Tmave pozadie so zlatym logom
- Service karty: Tmave s gold oramovanim pri hoveri
- Progress bar: Zlata miesto fialovej
- Datum/cas tlacidla: Gold akcent pre selected stav

### 6. Booking page -- Mobile (MobileCalendarShell + GlassHeader)

- GlassHeader: Aktualizacia "Dnes" tlacidla -- uz pouziva gold (dobre)
- Celkovy shell gradient: Teplejsie tony (warm black)
- Appointment bloky: Gold/amber pre confirmed, zachovat semanticke farby

### 7. Admin layout & Sidebar (src/components/AdminLayout.tsx)

- Sidebar: Zmena z fialovej na zlatu temu
- Logo ikona: Zlaty stvorcek (uz ciastocne funguje cez gold premennu)
- Nazov: "Papi Hair" -> "PAPI HAIR DESIGN"
- Aktivne polozky: Zlatý zvyraznenie
- Avatar fallback: Gold pozadie

### 8. Admin Dashboard (src/pages/admin/DashboardPage.tsx)

- Stat karty: Nahradenie farebnych ikon za gold-toned varianty
- Celkovy styl: Zachovat cistotu, len zmenit akcenty na gold

### 9. React-big-calendar overrides (src/index.css)

- `.rbc-event`: Zmena z primary (fialova) na gold
- `.rbc-toolbar button.rbc-active`: Gold pozadie
- `.rbc-current-time-indicator`: Gold
- `.rbc-today`: Warm gold tint

### 10. Vycistenie App.css

- Odstranenie nepouzivanych default Vite stylov (logo-spin, .card, atd.)

## Technicke detaily

### Subory na upravu (v poradi priority):
1. `src/index.css` -- CSS premenne (cela farebna paleta)
2. `src/styles/liquid-glass.css` -- Glass efekty
3. `src/pages/LiquidPlayground.tsx` -- Landing page texty a ikony
4. `src/components/AdminLayout.tsx` -- Sidebar branding
5. `src/pages/Auth.tsx` -- Auth stranka
6. `src/pages/BookingPage.tsx` -- Desktop booking
7. `src/components/calendar/GlassHeader.tsx` -- Mobile header (maly update)
8. `src/components/calendar/MobileCalendarShell.tsx` -- Mobile shell gradient
9. `src/pages/admin/DashboardPage.tsx` -- Dashboard stat karty
10. `src/App.css` -- Vycistenie

### Ziadne nove zavislosti
Vsetko sa robi cez CSS premenne a Tailwind -- nie su potrebne nove packages.

### Zachovane prvky
- Liquid Glass system (okna, drag, resize) -- len prefarbia sa
- Swipe animacie na mobile -- bez zmeny
- Vsetka funkcionalita (booking, auth, admin) -- len vizual
- Dark/light mode podpora -- obe temy sa aktualizuju
- Responsivne spravanie -- bez zmeny

## Ocakavany vysledok

Aplikacia bude vizualne ladit s oficialnym webom papihairdesign.sk -- tmave luxusne pozadie, zlate akcentne prvky, elegantny a premiovy dojem konzistentny napriec vsetkymi strankami (landing, booking, auth, admin).


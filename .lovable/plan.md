

# Prepinanie mesiac / tyzden / den v kalendari na /booking

## Prehlad

Pridanie view switchera (Mesiac / Tyzden / Den) do kalendara na /booking stranke. Fungovat bude rovnako pre verejnych pouzivatelov (booking) aj pre majitela (admin kalendar uz ma react-big-calendar s view switcherom -- ten zostava). Cielom je dat /booking stranke (mobilnej aj desktopovej) moznost prepinat medzi nahliadmi.

## Architektura riesenia

Pouzijeme existujuci custom DayTimeline pre denny pohlad a vytvorime dva nove komponenty pre mesacny a tyzdnovy pohlad. Nepouzijeme react-big-calendar na /booking (to je admin-only), ale vytvorime vlastne lahke komponenty ladene s gold temou.

### Nove komponenty

**1. `src/components/calendar/CalendarViewSwitcher.tsx`**
- Segmented control s tromi tlacidlami: Mesiac | Tyzden | Den
- Gold aktívny stav, glass-style pozadie
- Umiestneny v GlassHeader alebo pod nim

**2. `src/components/calendar/MonthGrid.tsx`**
- Mesacny grid (7 stlpcov x 5-6 riadkov)
- Kazdy den ukazuje pocet appointments ako bodky/badge
- Kliknutie na den prepne do dna (setView("day") + setDate)
- Dnesny den zvyrazneny gold kruzkom
- Dni mimo mesiaca stlmene

**3. `src/components/calendar/WeekTimeline.tsx`**
- 7 stlpcov (Po-Ne), kazdy s mini-timeline
- Kompaktne appointment bloky (iba farba + nazov sluzby)
- Horizontalny scroll ak je potrebny na mobile
- Kliknutie na den prepne do dna
- Alternativa: zoznamovy format -- kazdy den ako riadok s appointments pod sebou

### Upravene komponenty

**4. `src/components/calendar/GlassHeader.tsx`**
- Pridanie props: `view`, `onViewChange`
- Navigacia sa meni podla view:
  - Den: prev/next den (existujuce)
  - Tyzden: prev/next tyzden
  - Mesiac: prev/next mesiac
- Titul sa meni: "Dnes" / "12. - 18. jan" / "Januar 2026"
- CalendarViewSwitcher integrovaný priamo v headeri

**5. `src/components/calendar/MobileCalendarShell.tsx`**
- Novy state: `view` ("month" | "week" | "day")
- Podmienene renderovanie: MonthGrid / WeekTimeline / DayTimeline
- Appointments loading sa upravi:
  - Den: existujuci single-day fetch
  - Tyzden: fetch 7 dni
  - Mesiac: fetch cely mesiac
- Swipe navigacia funguje vo vsetkych views

**6. `src/pages/BookingPage.tsx`**
- Desktop verzia: pridanie rovnakeho view switchera nad existujuci step wizard
- Alebo: desktop uz ma kalendar v date stepe -- mozno staci len mobile

## Dizajn detaily

### Mesacny grid
- Tmave pozadie (bg-background), gold zvyraznenie dnesneho dna
- Appointment pocet: male gold bodky (1-3) alebo cislo v badge
- Dni s appointments maju jemny gold/amber tint
- Neaktivne dni (mimo mesiaca): text-muted-foreground/30

### Tyzdnovy pohlad
- Horizontalny layout s 7 stlpcami
- Kazdy stlpec ma header (Po 12.) a pod nim mini bloky appointments
- Bloky su farebne podla statusu (rovnako ako v DayTimeline)
- Kompaktne -- iba nazov sluzby a cas

### View switcher
- Pill/segmented control style
- bg-muted zaklad, bg-gold aktivny segment
- Animovany prechod medzi segmentmi

## Technicke detaily

### Subory na vytvorenie:
1. `src/components/calendar/CalendarViewSwitcher.tsx` -- segmented control
2. `src/components/calendar/MonthGrid.tsx` -- mesacny grid
3. `src/components/calendar/WeekTimeline.tsx` -- tyzdnovy pohlad

### Subory na upravu:
4. `src/components/calendar/GlassHeader.tsx` -- view switcher + navigacia podla view
5. `src/components/calendar/MobileCalendarShell.tsx` -- view state, podmienene renderovanie, rozsireny data fetch

### Datovy fetch
- MonthGrid: fetch appointments pre cely mesiac (startOfMonth -> endOfMonth)
- WeekTimeline: fetch appointments pre 7 dni (startOfWeek -> endOfWeek) 
- DayTimeline: existujuci single-day fetch (bez zmeny)
- Vsetky pouzivaju rovnaky appointment mapping

### Interakcie
- Mesiac: tap den -> prepne do denneho view na ten den
- Tyzden: tap den header -> prepne do denneho view; tap appointment -> otvori detail sheet
- Den: existujuce interakcie (tap slot, tap apt, long-press drag)
- Swipe: naviguje v ramci aktualneho view (den+-1, tyzden+-1, mesiac+-1)

### Ziadne nove zavislosti
Vsetko je custom-built s React + Tailwind + date-fns (uz nainstalovane).


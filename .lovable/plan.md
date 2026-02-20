

# Mesacny grid na plnu vysku (100dvh)

## Co sa zmeni

Roztiahneme MonthGrid tak, aby bunky dní vyplnili celý dostupný priestor pod headerom -- nie malé kompaktné štvorčeky, ale veľké prehľadné bunky na celú obrazovku.

## Technicke zmeny

### 1. `src/components/calendar/MonthGrid.tsx`
- Zmena root divu z `flex-1 overflow-y-auto px-3 py-2` na `flex flex-col h-full px-3 py-2`
- Day name headers: zostávajú kompaktné (fixná výška)
- Day cells grid: zmena z `grid grid-cols-7 gap-px` na `grid grid-cols-7 gap-px flex-1` -- pridanie `flex-1` aby grid zabral celý zvyšný priestor
- Každá bunka dňa: zmena z fixného `py-2.5` na `flex-1` so `min-h-0` aby sa rovnomerne roztiahli na celú výšku gridu
- Väčší font pre čísla dní (z `text-sm` na `text-base` alebo `text-lg`)
- Väčšie gold bodky indikátorov

### 2. `src/components/calendar/MobileCalendarShell.tsx`
- Motion wrapper (`flex-1 min-h-0`) už správne zaberá zvyšný priestor -- nie je potrebná zmena, len treba zabezpečiť že MonthGrid vnútorne využíva celú výšku

## Výsledok
Mesačný grid sa roztiahne na celú dostupnú výšku pod GlassHeader, bunky dní budú veľké a prehľadné.

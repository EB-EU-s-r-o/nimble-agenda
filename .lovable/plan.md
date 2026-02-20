

## Drag-to-Move pre appointments (long-press + 15-min snapping)

Pridanie Apple-like drag-to-move funkcionality: long-press na appointment spusti drag mode, appointment sleduje prst/myš, snappuje na 15-minútové intervaly, a po pusteni sa uloží nový čas do databázy.

---

### Zmeny v komponentoch

**1. AppointmentBlock.tsx** -- pridanie drag handlerov

- Pridať props: `isDragging`, `dragTop`, `onDragStart`
- Ak `isDragging` je true, pozícia sa riadi `dragTop` namiesto vypočítaného `top`
- Vizuálny feedback: scale-up, zvýšený z-index, silnejší glow/shadow počas drag-u
- Zrušiť `onClick` ak práve prebiehal drag (aby sa neotvoril detail sheet)

**2. DayTimeline.tsx** -- drag logika (Pointer Events)

- Pridať nový prop `onMoveAppointment: (id: string, newStart: Date) => void`
- Long-press detekcia (500ms timer cez `onPointerDown` na `.cal-apt`)
- Po aktivácii drag modu:
  - `onPointerMove`: prepočítať Y pozíciu na minúty, snapnuť na 15 min, aktualizovať `dragTop` state
  - `onPointerUp`: zavolať `onMoveAppointment` s novým časom, resetovať drag state
  - Haptic feedback indikátor: zobrazenie gold time labelu vedľa appointmentu počas ťahania
- Zablokovať scroll (`touch-action: none`) počas drag-u
- Zablokovať `handleGridTap` ak bol práve drag

**3. MobileCalendarShell.tsx** -- Supabase update handler

- Pridať `handleMoveAppointment(id, newStart)`:
  - Vypočítať nový `end_at` (zachovať rovnakú dĺžku trvania)
  - `supabase.from("appointments").update({ start_at, end_at }).eq("id", id)`
  - Toast "Rezervácia presunutá"
  - Reload appointments
- Predať ako prop do `DayTimeline`

---

### Technicky detaily

- **Long-press**: `setTimeout(500ms)` na `pointerdown`, zrušiť na `pointermove` (ak > 10px pred timeoutom) alebo `pointerup`
- **Snapping**: `Math.round(rawMinutes / 15) * 15` (rovnaký vzorec ako existujúci tap-to-slot)
- **Drag ghost label**: absolutne poziciovaný `<span>` vedľa bloku zobrazujúci napr. "10:15" v gold farbe
- **Hranice**: clamp na `START_HOUR * 60` az `END_HOUR * 60 - duration`
- **Pointer Events** namiesto Touch Events pre kompatibilitu s myšou aj dotykmi
- **setPointerCapture** na zachytenie pointer-u počas drag-u


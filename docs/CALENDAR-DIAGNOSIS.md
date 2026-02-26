# Diagnostika: boooooking calendar vs nimble-agenda kalendár

## Zdroj

- **boooooking calendar:** `C:\Users\42195\Documents\boooooking\calendar`
- **náš kalendár:** react-big-calendar na `/admin/calendar` (CalendarPage)

---

## Porovnanie

| Aspekt | boooooking calendar | nimble-agenda (react-big-calendar) |
|--------|---------------------|-------------------------------------|
| **Stack** | Next.js 15, React 19, react-day-picker (len date picker) | Vite, React 18, react-big-calendar |
| **Pohľady** | Day / Week / Month (vlastné komponenty) | Month / Week / Day (rbc) |
| **Udalosti** | Vlastný grid: 24h × 128px/hod, absolútna pozícia | rbc time grid, štandardné bloky |
| **Prekrývajúce sa udalosti** | Vedľa seba (výpočet left/width %), ako Google Calendar | Rbc ich skládane zobrazuje (menej prehľadné pri viacerých) |
| **Animácie** | Framer Motion (layoutId, enter/exit pri prepnutí mesiaca / výbere) | Žiadne |
| **Farby** | Každá udalosť má `color` (blue, indigo, pink, …) | Podľa `status` (pending/confirmed/cancelled/completed) v CSS triedach |
| **Kontext** | CalendarProvider (events, mode, date, dialógy) | Lokálny state v CalendarPage |
| **Backend** | Žiadny (mock dáta) | Firestore (appointments, customers, services) |
| **Vytvorenie rezervácie** | Dialog: názov, start, end, farba | Modal: služba, zamestnanec, dostupný slot (business logika) |
| **Úprava udalosti** | Dialog: title, start, end, color, delete | Modal: zmena statusu (pending/confirmed/cancelled/completed) |
| **Lokalizácia** | EN (format MMMM d, yyyy, h a) | SK (date-fns sk) |

---

## Čo je na boooooking kalendári lepšie

1. **Rozloženie prekrývajúcich sa udalostí** – v day/week view sa udalosti v tom istom čase zobrazujú vedľa seba (výpočet `left` a `width` v %), nie len pod sebou. To zlepšuje čitateľnosť pri plnom dni.
2. **Konzistentný dizajn** – jeden vizuálny štýl cez day/week/month, jednotný header (šípky, režim, tlačidlo pridat).
3. **Animácie** – Framer Motion pri prepnutí mesiaca a pri výbere udalostí; náš kalendár je statický.
4. **Čistá štruktúra** – CalendarProvider + Header + Body (day/week/month) + dialógy; náš kód je viac v jednej stránke.

---

## Čo si nechávame z nášho (nimble-agenda)

- **Firestore** – načítavanie a ukladanie appointments, customers, services, employees.
- **Booking modal** – výber služby, zamestnanca a slotu (nie len „názov + čas“).
- **Detail rezervácie** – zmena statusu (pending/confirmed/cancelled/completed), nie úprava času ani farby.
- **Slovenčina** – formátovanie a labely v SK.
- **Business pravidlá** – filtrovanie zamestnancov (allow_admin_as_provider), memberships.

---

## Záver

Kalendár z boooooking je lepší z hľadiska **UI a UX** (prekrývanie, animácie, štruktúra). Do nimble-agenda sa portuje **len vizuálna vrstva** (day/week/month grid, pozícia udalostí, header, režimy); logika rezervácií, Firestore a naše modály ostávajú.

Implementácia: nové komponenty `BookingCalendar` (provider, header, body day/week/month, event s výpočtom prekrytia), mapovanie `status → color`, pripojenie na existujúce modály (slot → booking modal, klik na udalosť → detail modal so zmenou statusu).

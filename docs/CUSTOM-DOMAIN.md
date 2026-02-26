# Vlastná doména: booking.papihairdesign.sk

V projekte je nastavená produkčná doména **https://booking.papihairdesign.sk**.

## Čo je v kóde

- **index.html:** `canonical` URL, `og:url` a `twitter:url` s `https://booking.papihairdesign.sk/`
- **PWA manifest:** `start_url: "/booking"` (relatívna – na tejto doméne bude `/booking`)

## Pripojenie domény v hostingu

### Firebase Hosting

1. [Firebase Console](https://console.firebase.google.com/) → projekt **phd-booking** → **Hosting** → **Vlastné domény**.
2. **Pridať vlastnú doménu** → zadať `booking.papihairdesign.sk` → dokončiť (Support email už nastavený).
3. **DNS u poskytovateľa** (Websupport, Cloudflare, atď.) – pridať záznam podľa toho, čo Firebase zobrazí. Typický prípad (overenie / nasmerovanie na Firebase):

   | Typ záznamu | Názov (host) | Hodnota (cieľ) |
   |-------------|--------------|----------------|
   | **CNAME**   | `booking` alebo `booking.papihairdesign.sk` | `phd-booking.web.app` |

   - **Názov:** Podľa poskytovateľa buď len `booking` (subdoména), alebo celé `booking.papihairdesign.sk`.
   - **Hodnota:** `phd-booking.web.app` (bez `https://`).
4. Po uložení DNS počkať na propagáciu (minúty až hodiny). V Firebase Console → Hosting → Vlastné domény skontrolovať stav; po overení Firebase doménu aktivuje a vydá SSL.

### Vercel

1. Vercel → váš projekt → **Settings** → **Domains**.
2. Pridajte `booking.papihairdesign.sk`.
3. Nastavte u poskytovateľa DNS CNAME: `booking` → `cname.vercel-dns.com` (alebo hodnotu, ktorú Vercel zobrazí).

## Firebase Auth (redirecty)

Ak používate prihlásenie (email link, OAuth), v **Firebase Console** → **Authentication** → **Settings** → **Authorized domains** pridajte `booking.papihairdesign.sk`.

## Premenné prostredia

Pri deployi môžete nastaviť napr.:

- `VITE_APP_URL=https://booking.papihairdesign.sk` (ak ho niekde v kóde používate)

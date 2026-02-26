# Analytics – čo máte a kde to nájdete

Máte **jednu** Google Analytics 4 (GA4) vlastnosť. Je rovnaká či ju otvoríte z **Firebase** alebo z **Google Analytics**.

---

## Váš Measurement ID

| Hodnota | Kde sa používa |
|--------|-----------------|
| **G-RQR6XKDKT4** | index.html (gtag.js), Firebase config (`measurementId`) |

---

## Kde overiť / spravovať Analytics

### 1. Firebase (ak ste pridali web app do projektu phd-booking)

- **URL:** https://console.firebase.google.com/
- **Krok:** Projekt **phd-booking** → ozubené koleso (**Project settings**) → sekcia **Your apps** → vyberte webovú aplikáciu.
- **Nájdete:** `measurementId: G-RQR6XKDKT4` (a možnosť „Open in Google Analytics“).

### 2. Google Analytics 4 (priamo)

- **URL:** https://analytics.google.com/
- **Krok:** **Admin** (ľavý dolný roh) → **Data streams** → vyberte web stream (napr. **phd-booking2026**).
- **Nájdete:** **Measurement ID** = `G-RQR6XKDKT4`.

Oba prístupy ukazujú na **tú istú** GA4 vlastnosť; Firebase len odkazuje na ňu.

---

## Čo v projekte posiela dáta do GA4

1. **Google tag (gtag.js)** v `index.html` – načíta sa pri každom načítaní stránky, posiela page_view a ďalšie udalosti.
2. **Firebase Analytics** v `main.tsx` (`initFirebaseAnalytics()`) – používa ten istý `measurementId` z Firebase konfigurácie, takže dáta idú do toho istého GA4 streamu.

Obe metódy používajú **G-RQR6XKDKT4**, takže máte jednu GA4 vlastnosť, nie dve.

---

## Rýchle linky

| Čo | URL |
|----|-----|
| Firebase Console (projekt) | https://console.firebase.google.com/project/phd-booking/settings/general |
| Google Analytics – Admin | https://analytics.google.com/ |
| Pridať vlastnosť (Search Console) | https://search.google.com/search-console/welcome |

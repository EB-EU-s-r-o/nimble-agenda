

## Nova prepracovana ikona aplikacie

### Co sa spravi

Pomocou AI generatora obrazkov (Gemini) sa vytvori nova, prepracovana ikona aplikacie na zaklade existujuceho loga PHD (PAPI HAIR DESIGN). Nasledne sa nahradi:

- `public/pwa-icon-192.png` (192x192)
- `public/pwa-icon-512.png` (512x512)  
- `public/favicon.ico`

### Dizajnovy smer

- Zachovat zlaty kruhovy emblem s motivom noznic/britvy a textom "PHD"
- Cistejsie linie, modernejsi look
- Optimalizovane pre male rozlisenia (favicon) aj velke (512px PWA)
- AMOLED cierne pozadie pre konzistenciu s temou aplikacie

### Technicke kroky

1. Pouzit Gemini image model na vygenerovanie novej ikony na zaklade existujuceho loga
2. Ulozit vysledok ako `public/pwa-icon-512.png` (512x512)
3. Vytvorit zmensenu verziu `public/pwa-icon-192.png` (192x192)
4. Aktualizovat `public/favicon.ico` referenciu v `index.html` na novy PNG subor
5. Existujuce referencie v `vite.config.ts` a `index.html` ostanu rovnake (pouzivaju rovnake nazvy suborov)


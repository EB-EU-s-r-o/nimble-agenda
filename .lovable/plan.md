

## Expanding Cards na /demo stranke

Premena /demo stranky na vizualne pohlcujuci dizajn s expandujucimi kartami (accordion-style), kde kazda karta reprezentuje jednu sekciu existujuceho obsahu.

### Koncept

Horizontalne karty na desktope (vertikalne na mobile), ktore sa po kliknuti roztiahnu a odkryju obsah. Kazda karta ma pozadie s gradient/efektom a zlatu ikonku. Aktivna karta zaberie vacsinu priestoru, neaktivne sa zuzuju na uzke pruzky s ikonkou.

### Struktura kariet (5 kariet)

1. **PAPI HAIR DESIGN** - Hero s logom, nadpisom a CTA buttonmi
2. **Demo ucty** - 3 demo ucty s copy buttonmi a prihlasenim
3. **Ako to funguje** - 3 kroky procesu
4. **Funkcie** - Grid 6 featurov
5. **QR kod** - QR kod na rezervaciu

### Technicke detaily

**Novy CSS subor** `src/styles/expanding-cards.css`:
- BEM konvencia (`.expanding-cards`, `.expanding-cards__option`, `.expanding-cards__option--active`)
- Flexbox layout s `transition: flex-grow 0.5s cubic-bezier(0.05, 0.61, 0.41, 0.95)`
- Neaktivne karty: `flex-grow: 1`, `min-width: 80px`, `border-radius: 24px`
- Aktivna karta: `flex-grow: 10`, `max-width: 700px`, `border-radius: 32px`
- Kazda karta ma gradient pozadie s AMOLED black a zlatymi akcentmi
- Shadow overlay na spodku pre citatelnost labelu
- Na mobile: vertikalny layout, kazda karta ma `min-height: 60px`, aktivna expanduje na `flex-grow: 6`

**Upraveny subor** `src/pages/DemoPage.tsx`:
- Nahradenie scrollovacej stranky za fullscreen expanding cards
- React state `activeCard` na sledovanie aktivnej karty (default: 0 = hero)
- Framer Motion `AnimatePresence` pre plynule prechody obsahu vnutri kariet
- Zachovanie vsetkych existujucich dat (demoAccounts, steps, features)
- Zachovanie `CopyButton` komponentu
- ThemeToggle zostava v pravom hornom rohu

**Vizualne detaily kazdej karty:**
- Neaktivna: zobrazuje len ikonu v zlatom kruhu + rotovany nazov sekcie
- Aktivna: plny obsah s animovanym fade-in, scrollovatelny ak je obsah vyssi
- Pozadie: cierne s jemnymi zlatymi gradient akcentmi (rozne pre kazdu kartu)
- Border: 1px solid rgba(218,165,32, 0.15) - konzistentne s liquid glass systemom
- Backdrop-blur pre glass efekt

**Responzivita:**
- Desktop (>768px): horizontalny layout, vyska 85vh
- Mobile (<=768px): vertikalny layout, plna vyska obrazovky, aktivna karta expanduje vertikalne

### Zhrnutie zmien

| Subor | Akcia |
|---|---|
| `src/styles/expanding-cards.css` | Novy - vsetky styly pre expanding cards |
| `src/pages/DemoPage.tsx` | Prepracovanie na expanding cards layout |




# Aktualizacia udajov PAPI HAIR DESIGN

## Co treba zmenit

### 1. Databaza -- udaje firmy
Aktualizacia zaznamu v tabulke `businesses`:

| Pole | Teraz | Novy udaj |
|------|-------|-----------|
| name | Papi Hair Studio | PAPI HAIR DESIGN |
| address | Hlavna 15, Bratislava | Trieda SNP 61 (Spolocensky pavilon), Kosice, Slovensko |
| phone | +421 900 123 456 | +421 949 459 624 |
| email | (prazdne) | papihairdesign@gmail.com |

Otvaracie hodiny a rychle odkazy su uz spravne nastavene v databaze -- nie je potrebna zmena.

### 2. Landing page (Index.tsx)
- Zmena podnadpisu z "Profesionalny rezervacny system pre salony krasy" na "Hair studio & Barber | Predaj vlasovej kozmetiky"
- Pridanie adresy a kontaktu pod hlavny nadpis

### 3. Booking page info
`BusinessInfoPanel` uz cita data z databazy, takze po aktualizacii DB sa automaticky zobrazia spravne udaje.

## Technicke kroky

1. **SQL migracia** -- UPDATE na tabulku `businesses` s novymi udajmi
2. **Index.tsx** -- aktualizacia textov na landing page
3. **Auth.tsx** -- kontrola ci sa tam zobrazuje nazov/popis, pripadna aktualizacia


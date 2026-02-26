# reCAPTCHA (Google Cloud / Firebase Auth)

Kľúče pre reCAPTCHA môžete získať v **Google Cloud Console** (napr. pri nastavení Firebase Auth / Identity Platform). Po vytvorení môže dokončenie nastavenia (advanced features ako MFA, Account Defender) trvať **cca 1 minútu**.

V projekte sa používa **reCAPTCHA v3** – neviditeľné (žiadny checkbox), overenie prebehne na pozadí pri odoslaní verejnej rezervácie.

## Kde použiť kľúče

| Kľúč | Kde použiť | Príklad |
|------|------------|---------|
| **Site key** (verejný) | Frontend – env premenná | `VITE_RECAPTCHA_SITE_KEY` v `.env` |
| **Secret key** (tajný) | Iba backend – nikdy v kóde ani v gite | `RECAPTCHA_SECRET` v konfigurácii Cloud Functions |

- **Site key:** Do `.env` v koreni projektu pridajte `VITE_RECAPTCHA_SITE_KEY=váš-site-key`. Používa sa v `BookingPage` pri odoslaní rezervácie (token sa získa neviditeľne pred POSTom).
- **Secret key:** Nastavte v **Firebase Console** → **Functions** → vyberte projekt → **Konfigurácia** / Environment variables: `RECAPTCHA_SECRET` = váš secret key. Alternatívne lokálne v `functions/.env` (necommitujte). Cloud Function `createPublicBooking` token overí; ak je secret nastavený a token chýba alebo je neplatný, rezervácia sa odmietne.

## Správanie

- Ak **nie je** nastavená `VITE_RECAPTCHA_SITE_KEY`, frontend neposiela token a rezervácia beží ako doteraz.
- Ak **nie je** nastavený `RECAPTCHA_SECRET` vo Functions, server token neoveruje.
- Ak **sú** oba nastavené, pred odoslaním rezervácie sa na pozadí získa reCAPTCHA v3 token (action `booking`), odošle sa v tele požiadavky a server overí cez Google siteverify; pri skóre &lt; 0,5 alebo chybe overenia sa vráti 400.

## Odkazy

- [Firebase Auth + reCAPTCHA](https://firebase.google.com/docs/auth/web/start#optional-apply-custom-parameters)
- [reCAPTCHA v3](https://developers.google.com/recaptcha/docs/v3)
- [reCAPTCHA admin](https://www.google.com/recaptcha/admin) – správa kľúčov a domén

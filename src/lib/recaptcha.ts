/**
 * reCAPTCHA v3 – invisible (žiadny checkbox).
 * Načíta skript len keď je VITE_RECAPTCHA_SITE_KEY nastavená a vráti token pre danú action.
 */
const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;
const SCRIPT_URL = "https://www.google.com/recaptcha/api.js?render=" + (SITE_KEY ?? "");

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}
const g = globalThis;

let scriptLoaded: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (!SITE_KEY) return Promise.resolve();
  if (scriptLoaded !== null) return scriptLoaded;
  scriptLoaded = new Promise((resolve, reject) => {
    if (document.querySelector('script[src^="https://www.google.com/recaptcha/api.js"]')) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("reCAPTCHA script failed to load"));
    document.head.appendChild(script);
  });
  return scriptLoaded;
}

/**
 * Získa reCAPTCHA v3 token pre danú action (napr. "booking", "login").
 * Žiadny vizuálny prvok – overenie prebehne na pozadí.
 * Vráti null ak nie je nastavená VITE_RECAPTCHA_SITE_KEY alebo pri chybe.
 */
export async function getRecaptchaToken(action: string): Promise<string | null> {
  if (!SITE_KEY?.trim()) return null;
  try {
    await loadScript();
    if (!g.grecaptcha) return null;
    return await g.grecaptcha.execute(SITE_KEY, { action });
  } catch {
    return null;
  }
}

export function isRecaptchaConfigured(): boolean {
  return Boolean(SITE_KEY?.trim());
}

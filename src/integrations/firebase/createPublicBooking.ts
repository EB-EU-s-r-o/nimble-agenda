/**
 * Vytvorenie verejnej rezervácie – volá Firebase Cloud Function alebo (ak nie je nastavená) Supabase Edge Function.
 * Firebase: VITE_FIREBASE_FUNCTIONS_URL (vyžaduje Blaze).
 * Supabase (náhrada bez Blaze): VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY.
 */
const FIREBASE_URL = (import.meta.env.VITE_FIREBASE_FUNCTIONS_URL as string) ?? "";
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) ?? "";
const SUPABASE_KEY = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ?? "";

export interface CreatePublicBookingBody {
  business_id: string;
  service_id: string;
  employee_id: string;
  start_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  /** reCAPTCHA v3 token (neviditeľné) – Firebase overí ak je secret; Supabase môže ignorovať */
  recaptcha_token?: string | null;
}

export interface CreatePublicBookingResponse {
  success?: boolean;
  error?: string;
  appointment_id?: string;
  claim_token?: string;
  customer_email?: string;
  customer_name?: string;
}

export async function createPublicBooking(body: CreatePublicBookingBody): Promise<CreatePublicBookingResponse> {
  const payload = {
    business_id: body.business_id,
    service_id: body.service_id,
    employee_id: body.employee_id,
    start_at: body.start_at,
    customer_name: body.customer_name,
    customer_email: body.customer_email,
    customer_phone: body.customer_phone ?? undefined,
  };

  if (FIREBASE_URL) {
    const res = await fetch(`${FIREBASE_URL}/createPublicBooking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, recaptcha_token: body.recaptcha_token }),
    });
    const data = (await res.json()) as CreatePublicBookingResponse;
    if (!res.ok) return { error: data.error ?? "Chyba servera" };
    return data;
  }

  if (SUPABASE_URL && SUPABASE_KEY) {
    const res = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/create-public-booking`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as CreatePublicBookingResponse;
    if (!res.ok) return { error: data.error ?? "Chyba servera" };
    return data;
  }

  return { error: "Nastavte VITE_FIREBASE_FUNCTIONS_URL alebo VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY" };
}

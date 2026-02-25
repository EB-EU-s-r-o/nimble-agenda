import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ALLOWED_ORIGINS = (Deno.env.get("PUBLIC_BOOKING_ALLOWED_ORIGINS") ?? "https://booking.papihairdesign.sk,http://localhost:8080,http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const buildCorsHeaders = (origin: string | null) => {
  const allowOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-idempotency-key",
    "Vary": "Origin",
  };
};

// --- Input validation helpers ---
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function validateInput(body: Record<string, unknown>): { error?: string } {
  const { business_id, service_id, employee_id, start_at, customer_name, customer_email, customer_phone, idempotency_key } = body;

  if (!business_id || !service_id || !employee_id || !start_at || !customer_name || !customer_email) {
    return { error: "Chýbajúce povinné polia" };
  }

  if (typeof business_id !== "string" || !UUID_RE.test(business_id)) return { error: "Neplatné business_id" };
  if (typeof service_id !== "string" || !UUID_RE.test(service_id)) return { error: "Neplatné service_id" };
  if (typeof employee_id !== "string" || !UUID_RE.test(employee_id)) return { error: "Neplatné employee_id" };

  if (typeof start_at !== "string" || !ISO_DATE_RE.test(start_at)) return { error: "Neplatný formát dátumu" };
  const d = new Date(start_at);
  if (isNaN(d.getTime())) return { error: "Neplatný dátum" };

  if (typeof customer_name !== "string" || customer_name.trim().length < 2 || customer_name.length > 200) {
    return { error: "Meno musí mať 2–200 znakov" };
  }

  if (typeof customer_email !== "string" || !EMAIL_RE.test(customer_email) || customer_email.length > 255) {
    return { error: "Neplatný email" };
  }

  if (customer_phone !== undefined && customer_phone !== null && customer_phone !== "") {
    if (typeof customer_phone !== "string" || customer_phone.length > 30) {
      return { error: "Telefón max 30 znakov" };
    }
  }

  if (idempotency_key !== undefined && idempotency_key !== null && idempotency_key !== "") {
    if (typeof idempotency_key !== "string" || idempotency_key.length < 8 || idempotency_key.length > 120) {
      return { error: "Neplatný idempotency_key" };
    }
  }

  return {};
}

// Simple in-memory IP rate limiter (per-isolate, resets on cold start)
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>();
const IP_LIMIT = 15; // max requests per window
const IP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function isIpRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequestCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRequestCounts.set(ip, { count: 1, resetAt: now + IP_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > IP_LIMIT;
}

/** Normalize email: lowercase, strip + aliases for gmail-like providers */
function normalizeEmail(email: string): string {
  const [localRaw, domain] = email.toLowerCase().trim().split("@");
  if (!domain) return email.toLowerCase().trim();
  // Strip +alias for common providers
  const local = localRaw.split("+")[0];
  return `${local}@${domain}`;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = buildCorsHeaders(origin);

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // IP-based rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? req.headers.get("cf-connecting-ip")
      ?? "unknown";

    if (isIpRateLimited(clientIp)) {
      return new Response(
        JSON.stringify({ error: "Príliš veľa požiadaviek. Skúste neskôr." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();

    // 0. Validate input
    const validation = validateInput(body);
    if (validation.error) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      business_id,
      service_id,
      employee_id,
      start_at,
      customer_name,
      customer_email,
      customer_phone,
      idempotency_key,
    } = body as Record<string, string>;

    const sanitizedName = customer_name.trim().slice(0, 200);
    const sanitizedEmail = normalizeEmail(customer_email).slice(0, 255);
    const sanitizedPhone = customer_phone ? String(customer_phone).trim().slice(0, 30) : null;


    const idempotencyKeyFromHeader = req.headers.get("x-idempotency-key")?.trim();
    const rawIdempotencyKey = idempotencyKeyFromHeader || idempotency_key || "";
    const idempotencyKey = rawIdempotencyKey ? rawIdempotencyKey.slice(0, 120) : "";

    if (idempotencyKey) {
      const { data: dedupExisting } = await supabase
        .from("sync_dedup")
        .select("result")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      const previousAppointmentId = dedupExisting?.result?.appointment_id;
      if (previousAppointmentId && typeof previousAppointmentId === "string") {
        return new Response(
          JSON.stringify({
            success: true,
            appointment_id: previousAppointmentId,
            idempotent_replay: true,
            customer_email: sanitizedEmail,
            customer_name: sanitizedName,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 0b. Rate limit: max 5 bookings per normalized email per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: matchingCustomers } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", business_id)
      .eq("email", sanitizedEmail);

    const customerIds = matchingCustomers?.map((c: { id: string }) => c.id) ?? [];

    let recentCount = 0;
    if (customerIds.length > 0) {
      const { count } = await supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business_id)
        .gte("created_at", oneHourAgo)
        .in("customer_id", customerIds);
      recentCount = count ?? 0;
    }

    if (recentCount >= 5) {
      return new Response(
        JSON.stringify({ error: "Príliš veľa rezervácií. Skúste neskôr." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Get service details
    const { data: service, error: svcErr } = await supabase
      .from("services")
      .select("*")
      .eq("id", service_id)
      .eq("business_id", business_id)
      .eq("is_active", true)
      .single();

    if (svcErr || !service) {
      return new Response(
        JSON.stringify({ error: "Služba nebola nájdená" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Verify employee exists and is active
    const { data: employee, error: empErr } = await supabase
      .from("employees")
      .select("*")
      .eq("id", employee_id)
      .eq("business_id", business_id)
      .eq("is_active", true)
      .single();

    if (empErr || !employee) {
      return new Response(
        JSON.stringify({ error: "Zamestnanec nebol nájdený" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2b. Admin bookability is controlled by business setting
    const { data: membership } = await supabase
      .from("memberships")
      .select("role")
      .eq("business_id", business_id)
      .eq("profile_id", employee.profile_id)
      .maybeSingle();

    if (membership?.role === "admin") {
      const { data: biz } = await supabase
        .from("businesses")
        .select("allow_admin_in_service_selection")
        .eq("id", business_id)
        .single();

      if (!biz?.allow_admin_in_service_selection) {
        return new Response(
          JSON.stringify({ error: "Administrátora nie je možné rezervovať pre služby (nastavenie je vypnuté)." }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 3. Calculate end time
    const startDate = new Date(start_at);
    const totalMinutes = service.duration_minutes + (service.buffer_minutes ?? 0);
    const endDate = new Date(startDate.getTime() + totalMinutes * 60 * 1000);

    // 4. Check for conflicts
    const { data: conflicts } = await supabase
      .from("appointments")
      .select("id")
      .eq("employee_id", employee_id)
      .neq("status", "cancelled")
      .lt("start_at", endDate.toISOString())
      .gt("end_at", startDate.toISOString());

    if (conflicts && conflicts.length > 0) {
      return new Response(
        JSON.stringify({ error: "Tento termín je už obsadený" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Create or find customer
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("business_id", business_id)
      .eq("email", sanitizedEmail)
      .maybeSingle();

    let customerId: string;
    if (existingCustomer) {
      customerId = existingCustomer.id;
      await supabase
        .from("customers")
        .update({ full_name: sanitizedName, phone: sanitizedPhone })
        .eq("id", customerId);
    } else {
      const { data: newCustomer, error: custErr } = await supabase
        .from("customers")
        .insert({
          business_id,
          full_name: sanitizedName,
          email: sanitizedEmail,
          phone: sanitizedPhone,
        })
        .select("id")
        .single();

      if (custErr || !newCustomer) {
        console.error("Customer creation error:", custErr);
        return new Response(
          JSON.stringify({ error: "Chyba pri vytváraní zákazníka" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      customerId = newCustomer.id;
    }

    // 6. Create appointment
    const { data: appointment, error: apptErr } = await supabase
      .from("appointments")
      .insert({
        business_id,
        customer_id: customerId,
        employee_id,
        service_id,
        start_at: startDate.toISOString(),
        end_at: endDate.toISOString(),
        status: "confirmed",
      })
      .select("id")
      .single();

    if (apptErr || !appointment) {
      console.error("Appointment creation error:", apptErr);
      if (apptErr?.code === "23P01") {
        return new Response(
          JSON.stringify({ error: "Tento termín je už obsadený" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Chyba pri vytváraní rezervácie" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (idempotencyKey) {
      await supabase.from("sync_dedup").upsert(
        {
          idempotency_key: idempotencyKey,
          business_id,
          action_type: "PUBLIC_BOOKING_CREATE",
          result: { appointment_id: appointment.id },
        },
        { onConflict: "idempotency_key" }
      );
    }

    // 7. Generate claim token (random 32-byte hex)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await supabase.from("booking_claims").insert({
      business_id,
      appointment_id: appointment.id,
      email: sanitizedEmail,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    });

    // Email notifications are triggered on backend by DB trigger.

    return new Response(
      JSON.stringify({
        success: true,
        appointment_id: appointment.id,
        claim_token: token,
        customer_email: sanitizedEmail,
        customer_name: sanitizedName,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-public-booking error:", err);
    return new Response(
      JSON.stringify({ error: "Interná chyba servera" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

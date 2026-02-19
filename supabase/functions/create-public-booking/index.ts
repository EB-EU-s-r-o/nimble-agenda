import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { business_id, service_id, employee_id, start_at, customer_name, customer_email, customer_phone } = body;

    // Validate required fields
    if (!business_id || !service_id || !employee_id || !start_at || !customer_name || !customer_email) {
      return new Response(
        JSON.stringify({ error: "Chýbajúce povinné polia" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
      .eq("email", customer_email)
      .maybeSingle();

    let customerId: string;
    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Update name/phone if changed
      await supabase
        .from("customers")
        .update({ full_name: customer_name, phone: customer_phone || null })
        .eq("id", customerId);
    } else {
      const { data: newCustomer, error: custErr } = await supabase
        .from("customers")
        .insert({
          business_id,
          full_name: customer_name,
          email: customer_email,
          phone: customer_phone || null,
        })
        .select("id")
        .single();

      if (custErr || !newCustomer) {
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
      return new Response(
        JSON.stringify({ error: "Chyba pri vytváraní rezervácie" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 7. Generate claim token (random 32-byte hex)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Hash token for storage
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(token));
    const tokenHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Store claim (expires in 30 minutes)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    await supabase.from("booking_claims").insert({
      business_id,
      appointment_id: appointment.id,
      email: customer_email,
      token_hash: tokenHash,
      expires_at: expiresAt.toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        appointment_id: appointment.id,
        claim_token: token,
        customer_email,
        customer_name,
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { appointment_id, business_id } = await req.json();

    if (!appointment_id || !business_id) {
      return new Response(
        JSON.stringify({ error: "Missing appointment_id or business_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Load SMTP config from business
    const { data: business, error: bizErr } = await supabase
      .from("businesses")
      .select("name, smtp_config, timezone")
      .eq("id", business_id)
      .single();

    if (bizErr || !business) {
      return new Response(
        JSON.stringify({ error: "Business not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smtp = business.smtp_config as SmtpConfig;
    if (!smtp?.host || !smtp?.user || !smtp?.pass) {
      console.warn("SMTP not configured for business", business_id);
      return new Response(
        JSON.stringify({ error: "SMTP not configured", skipped: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Load appointment details
    const { data: appt, error: apptErr } = await supabase
      .from("appointments")
      .select("*, customers(full_name, email, phone), services(name_sk, duration_minutes, price), employees(display_name)")
      .eq("id", appointment_id)
      .single();

    if (apptErr || !appt) {
      return new Response(
        JSON.stringify({ error: "Appointment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerEmail = appt.customers?.email;
    if (!customerEmail || customerEmail.includes("@internal")) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No valid customer email" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Format date/time
    const startDate = new Date(appt.start_at);
    const dateStr = startDate.toLocaleDateString("sk-SK", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      timeZone: business.timezone || "Europe/Bratislava",
    });
    const timeStr = startDate.toLocaleTimeString("sk-SK", {
      hour: "2-digit", minute: "2-digit",
      timeZone: business.timezone || "Europe/Bratislava",
    });

    const serviceName = appt.services?.name_sk ?? "Služba";
    const employeeName = appt.employees?.display_name ?? "";
    const duration = appt.services?.duration_minutes ?? 30;
    const price = appt.services?.price;
    const customerName = appt.customers?.full_name ?? "";

    // 4. Build HTML email
    const html = `
<!DOCTYPE html>
<html lang="sk">
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #f4f4f7; margin: 0; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 28px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">${business.name}</h1>
      <p style="color: #a0aec0; margin: 8px 0 0; font-size: 14px;">Potvrdenie rezervácie</p>
    </div>
    <div style="padding: 28px 24px;">
      <p style="font-size: 16px; color: #2d3748; margin: 0 0 20px;">
        Dobrý deň${customerName ? `, <strong>${customerName}</strong>` : ""},
      </p>
      <p style="font-size: 14px; color: #4a5568; margin: 0 0 20px;">
        Vaša rezervácia bola úspešne potvrdená. Tu sú detaily:
      </p>
      <div style="background: #f7fafc; border-radius: 8px; padding: 16px; margin: 0 0 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #718096; width: 110px;">Služba:</td>
            <td style="padding: 6px 0; color: #2d3748; font-weight: 600;">${serviceName}</td>
          </tr>
          ${employeeName ? `<tr>
            <td style="padding: 6px 0; color: #718096;">Zamestnanec:</td>
            <td style="padding: 6px 0; color: #2d3748;">${employeeName}</td>
          </tr>` : ""}
          <tr>
            <td style="padding: 6px 0; color: #718096;">Dátum:</td>
            <td style="padding: 6px 0; color: #2d3748; font-weight: 600;">${dateStr}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096;">Čas:</td>
            <td style="padding: 6px 0; color: #2d3748; font-weight: 600;">${timeStr}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096;">Trvanie:</td>
            <td style="padding: 6px 0; color: #2d3748;">${duration} minút</td>
          </tr>
          ${price ? `<tr>
            <td style="padding: 6px 0; color: #718096;">Cena:</td>
            <td style="padding: 6px 0; color: #2d3748; font-weight: 600;">${price} €</td>
          </tr>` : ""}
        </table>
      </div>
      <p style="font-size: 13px; color: #718096; margin: 0; line-height: 1.6;">
        Ak potrebujete rezerváciu zrušiť alebo zmeniť, kontaktujte nás prosím vopred.
      </p>
    </div>
    <div style="background: #f7fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 12px; color: #a0aec0; margin: 0;">${business.name} · Automatická správa</p>
    </div>
  </div>
</body>
</html>`;

    // 5. Send email via SMTP
    const client = new SMTPClient({
      connection: {
        hostname: smtp.host,
        port: smtp.port || 465,
        tls: true,
        auth: {
          username: smtp.user,
          password: smtp.pass,
        },
      },
    });

    await client.send({
      from: smtp.from || smtp.user,
      to: customerEmail,
      subject: `Potvrdenie rezervácie – ${serviceName} (${dateStr})`,
      html,
    });

    await client.close();

    console.log(`Confirmation email sent to ${customerEmail} for appointment ${appointment_id}`);

    return new Response(
      JSON.stringify({ success: true, sent_to: customerEmail }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-booking-email error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to send email", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

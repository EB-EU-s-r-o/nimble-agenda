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

type ReservationEvent = "reservation.created" | "reservation.updated" | "reservation.cancelled";
type RecipientKind = "admin" | "employee" | "customer";

interface Recipient {
  email: string;
  kind: RecipientKind;
  profileId?: string;
}

const EVENT_META: Record<ReservationEvent, { label: string; subjectPrefix: string }> = {
  "reservation.created": { label: "Nová rezervácia", subjectPrefix: "Nová rezervácia" },
  "reservation.updated": { label: "Zmena rezervácie", subjectPrefix: "Zmena rezervácie" },
  "reservation.cancelled": { label: "Zrušená rezervácia", subjectPrefix: "Zrušená rezervácia" },
};

function isNotificationsEnabled(settings: unknown, eventType: ReservationEvent): boolean {
  if (!settings || typeof settings !== "object") return true;
  const record = settings as Record<string, unknown>;

  if (record.emailNotificationsEnabled === false) return false;

  const eventFlagMap: Record<ReservationEvent, string> = {
    "reservation.created": "reservationCreated",
    "reservation.updated": "reservationUpdated",
    "reservation.cancelled": "reservationCancelled",
  };

  const key = eventFlagMap[eventType];
  if (key in record && record[key] === false) return false;

  return true;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function buildAdminHtml(payload: Record<string, string | null>) {
  return `
  <h2>${payload.eventLabel}</h2>
  <p><strong>Dátum:</strong> ${payload.dateStr}</p>
  <p><strong>Čas:</strong> ${payload.timeStr}</p>
  <p><strong>Zákazník:</strong> ${payload.customerName}</p>
  <p><strong>Služba:</strong> ${payload.serviceName}</p>
  <p><strong>Zamestnanec:</strong> ${payload.employeeName}</p>
  ${payload.notes ? `<p><strong>Poznámka:</strong> ${payload.notes}</p>` : ""}
  <p><strong>Stav:</strong> ${payload.status}</p>
  ${payload.appointmentLink ? `<p><a href="${payload.appointmentLink}">Otvoriť detail rezervácie</a></p>` : ""}
  <hr />
  <p style="color:#666">Typ príjemcu: admin/manager</p>
`;
}

function buildEmployeeHtml(payload: Record<string, string | null>) {
  return `${buildAdminHtml(payload)}<p style="color:#666">Typ príjemcu: employee</p>`;
}


async function sendWithRetry(client: SMTPClient, message: { from: string; to: string; subject: string; html: string }, attempts = 2) {
  let lastError: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      await client.send(message);
      return;
    } catch (error) {
      lastError = error;
      console.warn("Email send attempt failed", { to: message.to, attempt: i + 1, error: String(error) });
    }
  }
  throw lastError;
}

function buildCustomerHtml(payload: Record<string, string | null>) {
  return `
  <h2>${payload.eventLabel}</h2>
  <p>Dobrý deň ${payload.customerName},</p>
  <p>tu sú aktuálne detaily vašej rezervácie:</p>
  <p><strong>Dátum:</strong> ${payload.dateStr}</p>
  <p><strong>Čas:</strong> ${payload.timeStr}</p>
  <p><strong>Služba:</strong> ${payload.serviceName}</p>
  <p><strong>Zamestnanec:</strong> ${payload.employeeName}</p>
  <p><strong>Stav:</strong> ${payload.status}</p>
  ${payload.notes ? `<p><strong>Poznámka:</strong> ${payload.notes}</p>` : ""}
`;
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

    const { appointment_id, business_id, event_type } = await req.json();
    const reservationEvent = (event_type || "reservation.created") as ReservationEvent;

    if (!appointment_id || !business_id) {
      return new Response(
        JSON.stringify({ error: "Missing appointment_id or business_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!(reservationEvent in EVENT_META)) {
      return new Response(
        JSON.stringify({ error: "Invalid event_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: business, error: bizErr } = await supabase
      .from("businesses")
      .select("name, smtp_config, timezone, slug")
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

    const { data: appt, error: apptErr } = await supabase
      .from("appointments")
      .select("*, customers(full_name, email, phone), services(name_sk, duration_minutes, price), employees(id, display_name, profile_id, is_active)")
      .eq("id", appointment_id)
      .single();

    if (apptErr || !appt) {
      return new Response(
        JSON.stringify({ error: "Appointment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: members } = await supabase
      .from("memberships")
      .select("role, profile_id, profiles(email)")
      .eq("business_id", business_id)
      .in("role", ["owner", "admin", "employee"] as never);

    const { data: notificationSettings } = await supabase
      .from("user_notification_settings")
      .select("profile_id, settings")
      .eq("business_id", business_id);

    const settingsByProfile = new Map<string, Record<string, unknown>>(
      (notificationSettings || []).map((s: { profile_id: string; settings: Record<string, unknown> }) => [s.profile_id, s.settings])
    );

    const recipientsByEmail = new Map<string, Recipient>();

    for (const m of members || []) {
      const email = m.profiles?.email ? normalizeEmail(String(m.profiles.email)) : "";
      if (!email) {
        console.warn("Skipping recipient without email", { profile_id: m.profile_id, role: m.role, appointment_id });
        continue;
      }

      const settings = settingsByProfile.get(m.profile_id);
      if (!isNotificationsEnabled(settings, reservationEvent)) continue;

      if (m.role === "owner" || m.role === "admin") {
        recipientsByEmail.set(email, { email, kind: "admin", profileId: m.profile_id });
        continue;
      }

      if (m.role === "employee") {
        const employeeMatchesReservation =
          appt.employees?.profile_id &&
          m.profile_id === appt.employees.profile_id &&
          appt.employee_id === appt.employees.id &&
          appt.employees.is_active;

        if (employeeMatchesReservation) {
          recipientsByEmail.set(email, { email, kind: "employee", profileId: m.profile_id });
        }
      }
    }

    const customerEmail = appt.customers?.email ? normalizeEmail(appt.customers.email) : "";
    if (customerEmail && !customerEmail.includes("@internal")) {
      recipientsByEmail.set(customerEmail, { email: customerEmail, kind: "customer" });
    } else if (!customerEmail) {
      console.warn("Customer has no email, skipping customer notification", { appointment_id });
    }

    const recipients = [...recipientsByEmail.values()];
    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "No eligible recipients" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
    const employeeName = appt.employees?.display_name ?? "-";
    const customerName = appt.customers?.full_name ?? "zákazník";

    const payload = {
      eventLabel: EVENT_META[reservationEvent].label,
      dateStr,
      timeStr,
      customerName,
      serviceName,
      employeeName,
      notes: appt.notes || null,
      status: String(appt.status),
      appointmentLink: business.slug ? `${Deno.env.get("PUBLIC_APP_URL") ?? ""}/admin/appointments/${appointment_id}` : null,
    };

    const client = new SMTPClient({
      connection: {
        hostname: smtp.host,
        port: smtp.port || 465,
        tls: true,
        auth: { username: smtp.user, password: smtp.pass },
      },
    });

    const subject = `${EVENT_META[reservationEvent].subjectPrefix} – ${dateStr} ${timeStr} – ${employeeName}`;
    const results: Array<{ email: string; kind: RecipientKind; success: boolean; error?: string }> = [];

    for (const recipient of recipients) {
      try {
        const html = recipient.kind === "customer"
          ? buildCustomerHtml(payload)
          : recipient.kind === "employee"
            ? buildEmployeeHtml(payload)
            : buildAdminHtml(payload);

        await sendWithRetry(client, {
          from: smtp.from || smtp.user,
          to: recipient.email,
          subject,
          html,
        });

        results.push({ email: recipient.email, kind: recipient.kind, success: true });
      } catch (error) {
        console.error("Email send failure", { recipient, error: String(error), appointment_id, reservationEvent });
        results.push({ email: recipient.email, kind: recipient.kind, success: false, error: String(error) });
      }
    }

    await client.close();

    await supabase.from("reservation_notification_logs").insert(
      results.map((r) => ({
        appointment_id,
        business_id,
        event_type: reservationEvent,
        recipient_email: r.email,
        recipient_type: r.kind,
        success: r.success,
        error_message: r.error ?? null,
      }))
    );

    return new Response(
      JSON.stringify({ success: true, event_type: reservationEvent, results }),
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

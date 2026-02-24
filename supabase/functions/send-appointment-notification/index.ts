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

interface NotificationPayload {
  appointment_id: string;
  business_id: string;
  event_type: "created" | "updated" | "cancelled";
  // Optional: override for specific recipients (for testing)
  force_recipients?: string[];
}

interface Recipient {
  email: string;
  profile_id: string | null;
  type: "admin" | "employee";
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

    const payload: NotificationPayload = await req.json();

    // Validate input
    if (!payload.appointment_id || !payload.business_id || !payload.event_type) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: appointment_id, business_id, event_type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { appointment_id, business_id, event_type } = payload;

    // 1. Load appointment details with all relations
    const { data: appointment, error: apptErr } = await supabase
      .from("appointments")
      .select(`
        *,
        customers(full_name, email, phone),
        services(name_sk, duration_minutes, price),
        employees(display_name, email, profile_id, is_active)
      `)
      .eq("id", appointment_id)
      .single();

    if (apptErr || !appointment) {
      console.error("Failed to load appointment:", apptErr);
      return new Response(
        JSON.stringify({ error: "Appointment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Load business details with SMTP config
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

    // 3. Determine recipients
    const recipients: Recipient[] = [];

    // 3a. Get all admin emails for this business
    const { data: adminEmails, error: adminErr } = await supabase.rpc(
      "get_business_admin_emails",
      { _business_id: business_id }
    );

    if (adminErr) {
      console.error("Failed to get admin emails:", adminErr);
    } else if (adminEmails) {
      for (const admin of adminEmails) {
        if (admin.email && !recipients.find(r => r.email === admin.email)) {
          recipients.push({
            email: admin.email,
            profile_id: admin.profile_id,
            type: "admin"
          });
        }
      }
    }

    // 3b. Get employee email for this appointment (if different from admins)
    const employeeEmail = appointment.employees?.email;
    const employeeProfileId = appointment.employees?.profile_id;
    const employeeIsActive = appointment.employees?.is_active;

    if (employeeEmail && employeeIsActive) {
      // Check if employee email is already in admin list
      const alreadyInList = recipients.find(r => r.email === employeeEmail);
      
      if (!alreadyInList) {
        recipients.push({
          email: employeeEmail,
          profile_id: employeeProfileId,
          type: "employee"
        });
      }
    }

    // 4. Check deduplication - skip if already notified
    const uniqueRecipients: Recipient[] = [];
    for (const recipient of recipients) {
      const { data: wasSent, error: dedupErr } = await supabase.rpc(
        "was_notification_sent",
        {
          _appointment_id: appointment_id,
          _event_type: event_type,
          _recipient_email: recipient.email
        }
      );

      if (dedupErr) {
        console.error("Deduplication check failed:", dedupErr);
        continue;
      }

      if (!wasSent) {
        uniqueRecipients.push(recipient);
      } else {
        console.log(`Skipping duplicate notification to ${recipient.email} for ${event_type}`);
      }
    }

    if (uniqueRecipients.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No new recipients to notify", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Format date/time
    const startDate = new Date(appointment.start_at);
    const dateStr = startDate.toLocaleDateString("sk-SK", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
      timeZone: business.timezone || "Europe/Bratislava",
    });
    const timeStr = startDate.toLocaleTimeString("sk-SK", {
      hour: "2-digit", minute: "2-digit",
      timeZone: business.timezone || "Europe/Bratislava",
    });

    const serviceName = appointment.services?.name_sk ?? "Služba";
    const employeeName = appointment.employees?.display_name ?? "";
    const duration = appointment.services?.duration_minutes ?? 30;
    const price = appointment.services?.price;
    const customerName = appointment.customers?.full_name ?? "";
    const customerEmail = appointment.customers?.email ?? "";
    const customerPhone = appointment.customers?.phone ?? "";
    const notes = appointment.notes ?? "";

    // 6. Send emails to all recipients
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

    const results = [];

    for (const recipient of uniqueRecipients) {
      try {
        // Log pending notification
        const { data: logEntry, error: logErr } = await supabase
          .from("notification_logs")
          .insert({
            business_id,
            appointment_id,
            event_type,
            recipient_email: recipient.email,
            recipient_type: recipient.type,
            recipient_profile_id: recipient.profile_id,
            status: "pending",
            email_subject: buildSubject(event_type, serviceName, dateStr, employeeName, recipient.type),
          })
          .select("id")
          .single();

        if (logErr) {
          console.error("Failed to create notification log:", logErr);
        }

        // Build email content based on recipient type
        const subject = buildSubject(event_type, serviceName, dateStr, employeeName, recipient.type);
        const html = buildEmailHtml({
          eventType: event_type,
          recipientType: recipient.type,
          businessName: business.name,
          serviceName,
          employeeName,
          customerName,
          customerEmail,
          customerPhone,
          dateStr,
          timeStr,
          duration,
          price,
          notes,
          status: appointment.status,
        });

        // Send email
        await client.send({
          from: smtp.from || smtp.user,
          to: recipient.email,
          subject,
          html,
        });

        // Update log to sent
        if (logEntry) {
          await supabase
            .from("notification_logs")
            .update({ status: "sent", sent_at: new Date().toISOString() })
            .eq("id", logEntry.id);
        }

        results.push({ email: recipient.email, type: recipient.type, status: "sent" });
        console.log(`Notification sent to ${recipient.email} (${recipient.type}) for ${event_type}`);

      } catch (emailErr) {
        console.error(`Failed to send email to ${recipient.email}:`, emailErr);
        
        // Update log to failed
        await supabase
          .from("notification_logs")
          .update({ 
            status: "failed", 
            error_message: emailErr instanceof Error ? emailErr.message : String(emailErr)
          })
          .eq("appointment_id", appointment_id)
          .eq("event_type", event_type)
          .eq("recipient_email", recipient.email);

        results.push({ 
          email: recipient.email, 
          type: recipient.type, 
          status: "failed",
          error: emailErr instanceof Error ? emailErr.message : String(emailErr)
        });
      }
    }

    await client.close();

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: results.filter(r => r.status === "sent").length,
        failed: results.filter(r => r.status === "failed").length,
        results 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("send-appointment-notification error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper functions for email building
function buildSubject(
  eventType: string, 
  serviceName: string, 
  dateStr: string, 
  employeeName: string,
  recipientType: "admin" | "employee"
): string {
  const prefix = {
    created: recipientType === "admin" ? "Nová rezervácia" : "Nová rezervácia – pridelená vám",
    updated: "Zmena rezervácie",
    cancelled: "Zrušená rezervácia",
  }[eventType] || "Rezervácia";

  return `${prefix} – ${serviceName} – ${dateStr}${employeeName ? ` – ${employeeName}` : ""}`;
}

interface EmailData {
  eventType: string;
  recipientType: "admin" | "employee";
  businessName: string;
  serviceName: string;
  employeeName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  dateStr: string;
  timeStr: string;
  duration: number;
  price?: number;
  notes: string;
  status: string;
}

function buildEmailHtml(data: EmailData): string {
  const { eventType, recipientType, businessName, serviceName, employeeName, customerName, customerEmail, customerPhone, dateStr, timeStr, duration, price, notes, status } = data;

  const eventLabel = {
    created: "Nová rezervácia",
    updated: "Zmena rezervácie",
    cancelled: "Zrušená rezervácia",
  }[eventType] || "Rezervácia";

  const statusColor = status === "cancelled" ? "#e53e3e" : status === "confirmed" ? "#38a169" : "#d69e2e";

  return `<!DOCTYPE html>
<html lang="sk">
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #f4f4f7; margin: 0; padding: 20px;">
  <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 28px 24px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600;">${businessName}</h1>
      <p style="color: #a0aec0; margin: 8px 0 0; font-size: 14px;">${eventLabel}</p>
    </div>
    <div style="padding: 28px 24px;">
      <p style="font-size: 16px; color: #2d3748; margin: 0 0 20px;">
        Dobrý deň${recipientType === "employee" ? `, <strong>${employeeName}</strong>` : ""},
      </p>
      <p style="font-size: 14px; color: #4a5568; margin: 0 0 20px;">
        ${getEventMessage(eventType, recipientType)}
      </p>
      
      <div style="background: #f7fafc; border-radius: 8px; padding: 16px; margin: 0 0 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 6px 0; color: #718096; width: 110px;">Stav:</td>
            <td style="padding: 6px 0; color: ${statusColor}; font-weight: 600; text-transform: uppercase;">${status}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #718096;">Služba:</td>
            <td style="padding: 6px 0; color: #2d3748; font-weight: 600;">${serviceName}</td>
          </tr>
          ${recipientType === "admin" ? `<tr>
            <td style="padding: 6px 0; color: #718096;">Zamestnanec:</td>
            <td style="padding: 6px 0; color: #2d3748;">${employeeName || "Nezaradený"}</td>
          </tr>` : ""}
          <tr>
            <td style="padding: 6px 0; color: #718096;">Zákazník:</td>
            <td style="padding: 6px 0; color: #2d3748; font-weight: 600;">${customerName || "Neznámy"}</td>
          </tr>
          ${recipientType === "admin" && customerEmail ? `<tr>
            <td style="padding: 6px 0; color: #718096;">Email zák.:</td>
            <td style="padding: 6px 0; color: #2d3748;">${customerEmail}</td>
          </tr>` : ""}
          ${recipientType === "admin" && customerPhone ? `<tr>
            <td style="padding: 6px 0; color: #718096;">Tel. zák.:</td>
            <td style="padding: 6px 0; color: #2d3748;">${customerPhone}</td>
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
          ${notes ? `<tr>
            <td style="padding: 6px 0; color: #718096; vertical-align: top;">Poznámka:</td>
            <td style="padding: 6px 0; color: #2d3748; font-style: italic;">${notes}</td>
          </tr>` : ""}
        </table>
      </div>
      
      ${recipientType === "employee" ? `<p style="font-size: 13px; color: #718096; margin: 0; line-height: 1.6;">
        Táto rezervácia je pridelená vám. Ak máte otázky, kontaktujte prosím administrátora.
      </p>` : `<p style="font-size: 13px; color: #718096; margin: 0; line-height: 1.6;">
        Toto je automatická správa pre administrátorov. Rezerváciu môžete spravovať v admin rozhraní.
      </p>`}
    </div>
    <div style="background: #f7fafc; padding: 16px 24px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="font-size: 12px; color: #a0aec0; margin: 0;">${businessName} · Automatická správa</p>
    </div>
  </div>
</body>
</html>`;
}

function getEventMessage(eventType: string, recipientType: "admin" | "employee"): string {
  if (recipientType === "employee") {
    switch (eventType) {
      case "created":
        return "Bola vytvorená nová rezervácia a je pridelená vám.";
      case "updated":
        return "Vaša rezervácia bola upravená.";
      case "cancelled":
        return "Vaša rezervácia bola zrušená.";
      default:
        return "Detaily vašej rezervácie:";
    }
  } else {
    switch (eventType) {
      case "created":
        return "Bola vytvorená nová rezervácia v systéme.";
      case "updated":
        return "Existujúca rezervácia bola upravená.";
      case "cancelled":
        return "Rezervácia bola zrušená.";
      default:
        return "Detaily rezervácie:";
    }
  }
}

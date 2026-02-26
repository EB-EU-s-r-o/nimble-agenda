import * as nodemailer from "nodemailer";
import { onRequest } from "firebase-functions/v2/https";
import { db } from "./lib/firestore.js";
export const sendBookingEmail = onRequest({ cors: true, region: "europe-west1" }, async (req, res) => {
    if (req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Origin", "*").status(204).end();
        return;
    }
    try {
        const { appointment_id, business_id } = req.body || {};
        if (!appointment_id || !business_id) {
            res.status(400).json({ error: "Missing appointment_id or business_id" });
            return;
        }
        const [businessSnap, apptSnap] = await Promise.all([
            db.doc(`businesses/${business_id}`).get(),
            db.doc(`appointments/${appointment_id}`).get(),
        ]);
        const business = businessSnap.data();
        const appt = apptSnap.data();
        if (!business || !appt) {
            res.status(404).json({ error: "Business or appointment not found" });
            return;
        }
        const smtp = business.smtp_config;
        if (!smtp?.host || !smtp?.user || !smtp?.pass) {
            res.status(200).json({ error: "SMTP not configured", skipped: true });
            return;
        }
        const [customerSnap, serviceSnap, employeeSnap] = await Promise.all([
            db.doc(`customers/${appt.customer_id}`).get(),
            db.doc(`services/${appt.service_id}`).get(),
            db.doc(`employees/${appt.employee_id}`).get(),
        ]);
        const customer = customerSnap.data();
        const service = serviceSnap.data();
        const employee = employeeSnap.data();
        const customerEmail = customer?.email;
        if (!customerEmail || (typeof customerEmail === "string" && customerEmail.includes("@internal"))) {
            res.status(200).json({ skipped: true, reason: "No valid customer email" });
            return;
        }
        const timezone = business.timezone || "Europe/Bratislava";
        const startDate = new Date(appt.start_at);
        const dateStr = startDate.toLocaleDateString("sk-SK", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            timeZone: timezone,
        });
        const timeStr = startDate.toLocaleTimeString("sk-SK", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: timezone,
        });
        const serviceName = service?.name_sk ?? "Služba";
        const employeeName = employee?.display_name ?? "";
        const duration = service?.duration_minutes ?? 30;
        const price = service?.price;
        const customerName = customer?.full_name ?? "";
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
          ${employeeName ? `<tr><td style="padding: 6px 0; color: #718096;">Zamestnanec:</td><td style="padding: 6px 0; color: #2d3748;">${employeeName}</td></tr>` : ""}
          <tr><td style="padding: 6px 0; color: #718096;">Dátum:</td><td style="padding: 6px 0; color: #2d3748; font-weight: 600;">${dateStr}</td></tr>
          <tr><td style="padding: 6px 0; color: #718096;">Čas:</td><td style="padding: 6px 0; color: #2d3748; font-weight: 600;">${timeStr}</td></tr>
          <tr><td style="padding: 6px 0; color: #718096;">Trvanie:</td><td style="padding: 6px 0; color: #2d3748;">${duration} minút</td></tr>
          ${price != null ? `<tr><td style="padding: 6px 0; color: #718096;">Cena:</td><td style="padding: 6px 0; color: #2d3748; font-weight: 600;">${price} €</td></tr>` : ""}
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
        const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port || 465,
            secure: true,
            auth: { user: smtp.user, pass: smtp.pass },
        });
        await transporter.sendMail({
            from: smtp.from || smtp.user,
            to: customerEmail,
            subject: `Potvrdenie rezervácie – ${serviceName} (${dateStr})`,
            html,
        });
        res.status(200).json({ success: true, sent_to: customerEmail });
    }
    catch (err) {
        console.error("sendBookingEmail error:", err);
        res.status(500).json({ error: "Failed to send email", details: String(err) });
    }
});

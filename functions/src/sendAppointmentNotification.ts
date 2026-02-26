import * as nodemailer from "nodemailer";
import { onRequest, type Request } from "firebase-functions/v2/https";
import { db } from "./lib/firestore.js";

export const sendAppointmentNotification = onRequest(
  { cors: true, region: "europe-west1" },
  async (req: Request, res) => {
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Origin", "*").status(204).end();
      return;
    }
    try {
      const appointment_id = req.body?.appointment_id;
      const business_id = req.body?.business_id;
      const event_type = req.body?.event_type;
      if (!appointment_id || !business_id || !event_type) {
        res.status(400).json({ error: "Missing fields" });
        return;
      }
      const apptSnap = await db.doc("appointments/" + appointment_id).get();
      const businessSnap = await db.doc("businesses/" + business_id).get();
      const appt = apptSnap.data();
      const business = businessSnap.data();
      if (!appt || !business) {
        res.status(404).json({ error: "Not found" });
        return;
      }
      const smtp = business.smtp_config as Record<string, unknown> | undefined;
      if (!smtp?.host || !smtp?.user || !smtp?.pass) {
        res.status(200).json({ skipped: true });
        return;
      }
      const membershipsSnap = await db.collection("memberships").where("business_id", "==", business_id).get();
      const adminIds = membershipsSnap.docs.filter((d) => d.data().role === "owner" || d.data().role === "admin").map((d) => d.data().profile_id);
      const profilesSnap = await db.collection("profiles").get();
      const emails = new Set<string>();
      for (const d of profilesSnap.docs) {
        if (adminIds.includes(d.id) && d.data().email) emails.add(d.data().email as string);
      }
      const empSnap = await db.doc("employees/" + appt.employee_id).get();
      const empEmail = empSnap.data()?.email;
      if (empEmail) emails.add(empEmail as string);
      const custSnap = await db.doc("customers/" + appt.customer_id).get();
      const svcSnap = await db.doc("services/" + appt.service_id).get();
      const start = new Date(appt.start_at as string);
      const dateStr = start.toLocaleDateString("sk-SK");
      const timeStr = start.toLocaleTimeString("sk-SK", { hour: "2-digit", minute: "2-digit" });
      const svcName = (svcSnap.data()?.name_sk as string) || "";
      const empName = (empSnap.data()?.display_name as string) || "";
      const custName = (custSnap.data()?.full_name as string) || "";
      const subject = "Rezervacia " + event_type + " - " + svcName + " - " + dateStr;
      const html = "Rezervacia " + event_type + ". Zakaznik: " + custName + ". Datum: " + dateStr + " " + timeStr + ". Sluzba: " + svcName + ". Pracovnik: " + empName + ".";
      const transporter = nodemailer.createTransport({
        host: smtp.host as string,
        port: (smtp.port as number) || 465,
        secure: true,
        auth: { user: smtp.user as string, pass: smtp.pass as string },
      });
      const fromAddr = (smtp.from as string) || (smtp.user as string);
      for (const to of emails) {
        if (to && !to.includes("@internal")) await transporter.sendMail({ from: fromAddr, to, subject, html });
      }
      res.status(200).json({ success: true });
    } catch (err) {
      console.error("sendAppointmentNotification:", err);
      res.status(500).json({ error: String(err) });
    }
  }
);

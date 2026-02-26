import crypto from "crypto";
import { onRequest } from "firebase-functions/v2/https";
import { db } from "./lib/firestore.js";
import { z } from "zod";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const bodySchema = z.object({
    business_id: z.string().regex(UUID_RE),
    service_id: z.string().regex(UUID_RE),
    employee_id: z.string().regex(UUID_RE),
    start_at: z.string().regex(ISO_DATE_RE),
    customer_name: z.string().min(2).max(200),
    customer_email: z.string().email().max(255),
    customer_phone: z.string().max(30).optional().nullable(),
    recaptcha_token: z.string().min(1).optional().nullable(),
});
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET ?? "";
const RECAPTCHA_MIN_SCORE = 0.5;
async function verifyRecaptcha(token) {
    const secret = RECAPTCHA_SECRET.trim();
    if (!secret)
        return { ok: true, score: 1 };
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }).toString(),
    });
    const data = (await res.json());
    const score = typeof data.score === "number" ? data.score : 0;
    const ok = data.success === true && score >= RECAPTCHA_MIN_SCORE;
    return { ok, score };
}
function normalizeEmail(email) {
    const [localRaw, domain] = email.toLowerCase().trim().split("@");
    if (!domain)
        return email.toLowerCase().trim();
    const local = localRaw.split("+")[0];
    return `${local}@${domain}`;
}
async function isEmployeeBookable(businessId, employeeId, employeeProfileId, allowAdminAsProvider) {
    const [employeeServicesSnap, businessSnap] = await Promise.all([
        db.collection("employee_services").where("employee_id", "==", employeeId).limit(1).get(),
        db.doc(`businesses/${businessId}`).get(),
    ]);
    if (!employeeServicesSnap.empty)
        return true;
    if (!allowAdminAsProvider || !employeeProfileId)
        return false;
    const mid = `${employeeProfileId}_${businessId}`;
    const memSnap = await db.doc(`memberships/${mid}`).get();
    const role = memSnap.data()?.role;
    return role === "owner" || role === "admin";
}
export const createPublicBooking = onRequest({ cors: true, region: "europe-west1" }, async (req, res) => {
    if (req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Origin", "*").status(204).end();
        return;
    }
    try {
        const parsed = bodySchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ error: "Neplatné vstupné údaje" });
            return;
        }
        const { business_id, service_id, employee_id, start_at, customer_name, customer_email, customer_phone, recaptcha_token, } = parsed.data;
        if (RECAPTCHA_SECRET.trim()) {
            if (!recaptcha_token?.trim()) {
                res.status(400).json({ error: "Chýba overenie (reCAPTCHA). Obnovte stránku a skúste znova." });
                return;
            }
            const { ok } = await verifyRecaptcha(recaptcha_token);
            if (!ok) {
                res.status(400).json({ error: "Overenie zlyhalo. Skúste znova alebo obnovte stránku." });
                return;
            }
        }
        const sanitizedEmail = normalizeEmail(customer_email).slice(0, 255);
        const sanitizedName = customer_name.trim().slice(0, 200);
        const sanitizedPhone = customer_phone ? String(customer_phone).trim().slice(0, 30) : null;
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const customersSnap = await db
            .collection("customers")
            .where("business_id", "==", business_id)
            .where("email", "==", sanitizedEmail)
            .get();
        const customerIds = customersSnap.docs.map((d) => d.id);
        if (customerIds.length > 0) {
            const recentSnap = await db
                .collection("appointments")
                .where("business_id", "==", business_id)
                .where("customer_id", "in", customerIds.slice(0, 10))
                .where("created_at", ">=", oneHourAgo)
                .get();
            if (recentSnap.size >= 5) {
                res.status(429).json({ error: "Príliš veľa rezervácií. Skúste neskôr." });
                return;
            }
        }
        const [serviceSnap, employeeSnap] = await Promise.all([
            db.doc(`services/${service_id}`).get(),
            db.doc(`employees/${employee_id}`).get(),
        ]);
        const service = serviceSnap.data();
        const employee = employeeSnap.data();
        if (!serviceSnap.exists || !service || service.business_id !== business_id || !service.is_active) {
            res.status(404).json({ error: "Služba nebola nájdená" });
            return;
        }
        if (!employeeSnap.exists || !employee || employee.business_id !== business_id || !employee.is_active) {
            res.status(404).json({ error: "Zamestnanec nebol nájdený" });
            return;
        }
        const bookable = await isEmployeeBookable(business_id, employee_id, employee.profile_id ?? null, (await db.doc(`businesses/${business_id}`).get()).data()?.allow_admin_as_provider === true);
        if (!bookable) {
            res.status(403).json({ error: "Tento pracovník nie je dostupný pre rezerváciu služieb" });
            return;
        }
        const startDate = new Date(start_at);
        const totalMinutes = (service.duration_minutes ?? 0) + (service.buffer_minutes ?? 0);
        const endDate = new Date(startDate.getTime() + totalMinutes * 60 * 1000);
        const conflictsSnap = await db
            .collection("appointments")
            .where("employee_id", "==", employee_id)
            .where("status", "!=", "cancelled")
            .get();
        const hasConflict = conflictsSnap.docs.some((d) => {
            const dta = d.data();
            const start = new Date(dta.start_at).getTime();
            const end = new Date(dta.end_at).getTime();
            return start < endDate.getTime() && end > startDate.getTime();
        });
        if (hasConflict) {
            res.status(409).json({ error: "Tento termín je už obsadený" });
            return;
        }
        let customerId;
        const existingCustomer = customersSnap.docs[0];
        if (existingCustomer) {
            customerId = existingCustomer.id;
            await existingCustomer.ref.update({
                full_name: sanitizedName,
                phone: sanitizedPhone,
                updated_at: new Date().toISOString(),
            });
        }
        else {
            const newCustomerRef = db.collection("customers").doc();
            await newCustomerRef.set({
                business_id,
                full_name: sanitizedName,
                email: sanitizedEmail,
                phone: sanitizedPhone,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
            customerId = newCustomerRef.id;
        }
        const appointmentRef = db.collection("appointments").doc();
        await appointmentRef.set({
            business_id,
            customer_id: customerId,
            employee_id,
            service_id,
            start_at: startDate.toISOString(),
            end_at: endDate.toISOString(),
            status: "confirmed",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
        const appointmentId = appointmentRef.id;
        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
        await db.collection("booking_claims").add({
            business_id,
            appointment_id: appointmentId,
            email: sanitizedEmail,
            token_hash: tokenHash,
            expires_at: expiresAt.toISOString(),
            created_at: new Date().toISOString(),
        });
        const baseUrl = process.env.FIREBASE_CLOUD_FUNCTIONS_URL || "";
        if (baseUrl) {
            fetch(`${baseUrl}/sendBookingEmail`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ appointment_id: appointmentId, business_id }),
            }).catch((e) => console.error("Email trigger failed:", e));
            fetch(`${baseUrl}/sendAppointmentNotification`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ appointment_id: appointmentId, business_id, event_type: "created" }),
            }).catch((e) => console.error("Notification trigger failed:", e));
        }
        res.status(200).json({
            success: true,
            appointment_id: appointmentId,
            claim_token: token,
            customer_email: sanitizedEmail,
            customer_name: sanitizedName,
        });
    }
    catch (err) {
        console.error("createPublicBooking error:", err);
        res.status(500).json({ error: "Interná chyba servera" });
    }
});

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "./lib/firestore.js";
import { z } from "zod";
const schema = z.object({ days: z.number().min(1).max(30).optional().default(2) });
export const syncPull = onCall({ region: "europe-west1" }, async (request) => {
    if (!request.auth)
        throw new HttpsError("unauthenticated", "Unauthorized");
    const uid = request.auth.uid;
    const membershipSnap = await db
        .collection("memberships")
        .where("profile_id", "==", uid)
        .get();
    const adminMembership = membershipSnap.docs.find((d) => ["owner", "admin", "employee"].includes(d.data().role));
    if (!adminMembership) {
        throw new HttpsError("permission-denied", "No business membership");
    }
    const businessId = adminMembership.data().business_id;
    const { days } = schema.parse(request.data ?? {});
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(startOfDay.getTime() + days * 24 * 60 * 60 * 1000);
    const appointmentsSnap = await db
        .collection("appointments")
        .where("business_id", "==", businessId)
        .where("start_at", ">=", startOfDay.toISOString())
        .where("start_at", "<", endDate.toISOString())
        .orderBy("start_at")
        .get();
    const mapped = [];
    for (const d of appointmentsSnap.docs) {
        const a = d.data();
        if (a.status === "cancelled")
            continue;
        const [customerSnap, employeeSnap, serviceSnap] = await Promise.all([
            db.doc(`customers/${a.customer_id}`).get(),
            db.doc(`employees/${a.employee_id}`).get(),
            db.doc(`services/${a.service_id}`).get(),
        ]);
        mapped.push({
            id: d.id,
            start_at: a.start_at,
            end_at: a.end_at,
            customer_name: customerSnap.data()?.full_name ?? "?",
            customer_phone: customerSnap.data()?.phone,
            employee_id: a.employee_id,
            employee_name: employeeSnap.data()?.display_name,
            service_id: a.service_id,
            service_name: serviceSnap.data()?.name_sk,
            status: a.status,
            updated_at: new Date().toISOString(),
            synced: true,
        });
    }
    return { ok: true, appointments: mapped, days };
});

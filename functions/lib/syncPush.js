import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "./lib/firestore.js";
async function triggerNotification(appointmentId, businessId, eventType) {
    const baseUrl = process.env.FIREBASE_CLOUD_FUNCTIONS_URL;
    if (!baseUrl)
        return;
    try {
        await fetch(`${baseUrl}/sendAppointmentNotification`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appointment_id: appointmentId, business_id: businessId, event_type: eventType }),
        });
    }
    catch (e) {
        console.error("Notification trigger failed:", e);
    }
}
export const syncPush = onCall({ region: "europe-west1" }, async (request) => {
    if (!request.auth)
        throw new HttpsError("unauthenticated", "Unauthorized");
    const uid = request.auth.uid;
    const membershipSnap = await db.collection("memberships").where("profile_id", "==", uid).get();
    const adminMembership = membershipSnap.docs.find((d) => ["owner", "admin"].includes(d.data().role));
    if (!adminMembership)
        throw new HttpsError("permission-denied", "Not a business admin");
    const businessId = adminMembership.data().business_id;
    const actions = request.data?.actions ?? [];
    const conflicts = [];
    let applied = 0;
    for (const action of actions) {
        const dedupSnap = await db.collection("sync_dedup").where("business_id", "==", businessId).where("idempotency_key", "==", action.idempotency_key).limit(1).get();
        if (!dedupSnap.empty) {
            applied++;
            continue;
        }
        try {
            if (action.type === "APPOINTMENT_CREATE") {
                const p = action.payload;
                const employeeId = p.employee_id || "";
                const startAt = p.start_at;
                const endAt = p.end_at;
                const apptId = p.id || db.collection("appointments").doc().id;
                const conflictsSnap = await db.collection("appointments").where("business_id", "==", businessId).where("employee_id", "==", employeeId).get();
                const hasConflict = conflictsSnap.docs.some((d) => {
                    const dta = d.data();
                    return dta.status !== "cancelled" && new Date(dta.end_at) > new Date(startAt) && new Date(dta.start_at) < new Date(endAt);
                });
                if (hasConflict) {
                    conflicts.push({ idempotency_key: action.idempotency_key, reason: "Slot already occupied" });
                    continue;
                }
                const walkinEmail = `walkin-${apptId}@internal`;
                const customersSnap = await db.collection("customers").where("business_id", "==", businessId).where("email", "==", walkinEmail).get();
                let customerId;
                if (!customersSnap.empty) {
                    customerId = customersSnap.docs[0].id;
                }
                else {
                    const newCustRef = db.collection("customers").doc();
                    await newCustRef.set({
                        business_id: businessId,
                        full_name: p.customer_name || "Walk-in",
                        email: walkinEmail,
                        phone: p.customer_phone ?? null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });
                    customerId = newCustRef.id;
                }
                const appointmentRef = db.collection("appointments").doc(apptId);
                await appointmentRef.set({
                    business_id: businessId,
                    customer_id: customerId,
                    employee_id: employeeId,
                    service_id: p.service_id ?? null,
                    start_at: startAt,
                    end_at: endAt,
                    status: p.status || "confirmed",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
                await triggerNotification(apptId, businessId, "created");
            }
            else if (action.type === "APPOINTMENT_UPDATE") {
                const p = action.payload;
                const apptId = p.id;
                const ref = db.doc(`appointments/${apptId}`);
                const snap = await ref.get();
                if (!snap.exists || snap.data()?.business_id !== businessId) {
                    conflicts.push({ idempotency_key: action.idempotency_key, reason: "Appointment not found" });
                    continue;
                }
                const update = { updated_at: new Date().toISOString() };
                if (p.start_at)
                    update.start_at = p.start_at;
                if (p.end_at)
                    update.end_at = p.end_at;
                if (p.status)
                    update.status = p.status;
                await ref.update(update);
                await triggerNotification(apptId, businessId, "updated");
            }
            else if (action.type === "APPOINTMENT_CANCEL") {
                const apptId = action.payload.id;
                const ref = db.doc(`appointments/${apptId}`);
                const snap = await ref.get();
                if (!snap.exists || snap.data()?.business_id !== businessId) {
                    conflicts.push({ idempotency_key: action.idempotency_key, reason: "Appointment not found" });
                    continue;
                }
                await ref.update({ status: "cancelled", updated_at: new Date().toISOString() });
                await triggerNotification(apptId, businessId, "cancelled");
            }
            await db.collection("sync_dedup").add({
                business_id: businessId,
                idempotency_key: action.idempotency_key,
                action_type: action.type,
                created_at: new Date().toISOString(),
            });
            applied++;
        }
        catch (e) {
            conflicts.push({ idempotency_key: action.idempotency_key, reason: e.message });
        }
    }
    return { ok: true, applied, conflicts: conflicts.length ? conflicts : undefined };
});

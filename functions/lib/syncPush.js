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
async function applyCreate(action, businessId) {
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
    if (hasConflict)
        return { ok: false, reason: "Slot already occupied" };
    const walkinEmail = `walkin-${apptId}@internal`;
    const customersSnap = await db.collection("customers").where("business_id", "==", businessId).where("email", "==", walkinEmail).get();
    let customerId;
    if (customersSnap.empty) {
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
    else {
        customerId = customersSnap.docs[0].id;
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
    return { ok: true };
}
async function applyUpdate(action, businessId) {
    const p = action.payload;
    const apptId = p.id;
    const ref = db.doc(`appointments/${apptId}`);
    const snap = await ref.get();
    const data = snap.data();
    if (!snap.exists || data?.business_id !== businessId) {
        return { ok: false, reason: "Appointment not found" };
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
    return { ok: true };
}
async function applyCancel(action, businessId) {
    const apptId = action.payload.id;
    if (typeof apptId !== "string")
        return { ok: false, reason: "Appointment not found" };
    const ref = db.doc(`appointments/${apptId}`);
    const snap = await ref.get();
    const data = snap.data();
    if (!snap.exists || data?.business_id !== businessId) {
        return { ok: false, reason: "Appointment not found" };
    }
    await ref.update({ status: "cancelled", updated_at: new Date().toISOString() });
    await triggerNotification(apptId, businessId, "cancelled");
    return { ok: true };
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
            let result;
            if (action.type === "APPOINTMENT_CREATE") {
                result = await applyCreate(action, businessId);
            }
            else if (action.type === "APPOINTMENT_UPDATE") {
                result = await applyUpdate(action, businessId);
            }
            else if (action.type === "APPOINTMENT_CANCEL") {
                result = await applyCancel(action, businessId);
            }
            else {
                continue;
            }
            if (!result.ok) {
                conflicts.push({ idempotency_key: action.idempotency_key, reason: result.reason });
                continue;
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

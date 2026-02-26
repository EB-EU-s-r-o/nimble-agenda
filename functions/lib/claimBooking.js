import crypto from "crypto";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, membershipsDocId } from "./lib/firestore.js";
import { z } from "zod";
const schema = z.object({ claim_token: z.string().min(1) });
export const claimBooking = onCall({ region: "europe-west1" }, async (request) => {
    if (!request.auth)
        throw new HttpsError("unauthenticated", "Neautorizovaný prístup");
    const uid = request.auth.uid;
    const parsed = schema.safeParse(request.data);
    if (!parsed.success)
        throw new HttpsError("invalid-argument", "Chýba claim token");
    const tokenHash = crypto.createHash("sha256").update(parsed.data.claim_token).digest("hex");
    const claimsSnap = await db.collection("booking_claims").where("token_hash", "==", tokenHash).get();
    const claimDoc = claimsSnap.docs.find((d) => !d.data().used_at);
    if (!claimDoc)
        throw new HttpsError("not-found", "Neplatný alebo expirovaný token");
    const claim = claimDoc.data();
    if (new Date(claim.expires_at) < new Date())
        throw new HttpsError("failed-precondition", "Token expiroval");
    const email = claim.email;
    const businessId = claim.business_id;
    const customersSnap = await db.collection("customers").where("business_id", "==", businessId).where("email", "==", email).get();
    const batch = db.batch();
    for (const d of customersSnap.docs)
        batch.update(d.ref, { profile_id: uid, updated_at: new Date().toISOString() });
    batch.update(claimDoc.ref, { used_at: new Date().toISOString() });
    const mid = membershipsDocId(uid, businessId);
    const memRef = db.doc(`memberships/${mid}`);
    if (!(await memRef.get()).exists)
        batch.set(memRef, { profile_id: uid, business_id: businessId, role: "customer", created_at: new Date().toISOString() });
    await batch.commit();
    return { success: true, message: "Účet bol úspešne prepojený" };
});

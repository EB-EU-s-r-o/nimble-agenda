import crypto from "crypto";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "./lib/firestore.js";
export const webauthnRegisterChallenge = onCall({ region: "europe-west1" }, async (request) => {
    if (!request.auth)
        throw new HttpsError("unauthenticated", "Unauthorized");
    const uid = request.auth.uid;
    const challengeB64 = crypto.randomBytes(32).toString("base64");
    const existingSnap = await db.collection("passkeys").where("profile_id", "==", uid).get();
    const excludeCredentials = existingSnap.docs.map((d) => ({ id: d.data().credential_id, type: "public-key" }));
    return {
        challenge: challengeB64,
        rp: { name: "Papi Hair Design", id: "localhost" },
        user: { id: uid, name: request.auth.token.email || uid, displayName: request.auth.token.name || "User" },
        excludeCredentials,
        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
        timeout: 60000,
        attestation: "none",
        authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "preferred", userVerification: "required" },
    };
});
export const webauthnRegister = onCall({ region: "europe-west1" }, async (request) => {
    if (!request.auth)
        throw new HttpsError("unauthenticated", "Unauthorized");
    const uid = request.auth.uid;
    const credentialId = request.data?.credentialId;
    const publicKey = request.data?.publicKey;
    const deviceName = request.data?.deviceName;
    if (!credentialId || credentialId.length > 500 || !publicKey || publicKey.length > 2000) {
        throw new HttpsError("invalid-argument", "Invalid credential ID or public key");
    }
    const safeName = deviceName ? String(deviceName).slice(0, 100).replace(/[<>"'&]/g, "") : "Passkey";
    await db.collection("passkeys").add({
        profile_id: uid,
        credential_id: credentialId,
        public_key: publicKey,
        device_name: safeName,
        sign_count: 0,
        created_at: new Date().toISOString(),
    });
    return { success: true };
});

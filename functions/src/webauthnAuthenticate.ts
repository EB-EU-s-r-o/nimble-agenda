import { getAuth } from "firebase-admin/auth";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db } from "./lib/firestore.js";

export const webauthnAuthenticateChallenge = onCall({ region: "europe-west1" }, async (request) => {
  const email = (request.data?.email as string)?.trim()?.toLowerCase();
  let allowCredentials: { id: string; type: string }[] = [];
  if (email) {
    const profilesSnap = await db.collection("profiles").where("email", "==", email).limit(1).get();
    if (!profilesSnap.empty) {
      const profileId = profilesSnap.docs[0].id;
      const passkeysSnap = await db.collection("passkeys").where("profile_id", "==", profileId).get();
      allowCredentials = passkeysSnap.docs.map((d) => ({ id: d.data().credential_id, type: "public-key" }));
    }
  }
  const crypto = await import("crypto");
  const challengeB64 = crypto.randomBytes(32).toString("base64");
  return { challenge: challengeB64, rpId: "localhost", timeout: 60000, userVerification: "required", allowCredentials };
});

export const webauthnAuthenticate = onCall({ region: "europe-west1" }, async (request) => {
  const credentialId = request.data?.credentialId as string;
  if (!credentialId) throw new HttpsError("invalid-argument", "Missing credential");
  const passkeysSnap = await db.collection("passkeys").where("credential_id", "==", credentialId).limit(1).get();
  if (passkeysSnap.empty) throw new HttpsError("not-found", "Passkey not found");
  const passkeyDoc = passkeysSnap.docs[0];
  const passkey = passkeyDoc.data();
  const profileId = passkey.profile_id as string;
  await passkeyDoc.ref.update({ last_used_at: new Date().toISOString(), sign_count: (passkey.sign_count || 0) + 1 });
  const profileSnap = await db.doc("profiles/" + profileId).get();
  const email = profileSnap.data()?.email as string | undefined;
  if (!email) throw new HttpsError("failed-precondition", "No email associated");
  const auth = getAuth();
  const customToken = await auth.createCustomToken(profileId);
  return { success: true, email, customToken };
});

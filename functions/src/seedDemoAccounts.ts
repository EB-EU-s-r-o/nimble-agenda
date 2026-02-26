import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";
import { db, membershipsDocId } from "./lib/firestore.js";

export const seedDemoAccounts = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Unauthorized");
  const auth = getAuth();
  const businessId = request.data?.business_id as string | undefined;
  if (!businessId) throw new HttpsError("invalid-argument", "Missing business_id");

  const mid = membershipsDocId(request.auth.uid, businessId);
  const memSnap = await db.doc(`memberships/${mid}`).get();
  if (memSnap.data()?.role !== "owner") throw new HttpsError("permission-denied", "Only owner can seed demo");

  /* Účty zhodné s Demo stránkou a README (demo@ / owner@ papihairdesign.sk) */
  const ownerEmail = "owner@papihairdesign.sk";
  const demoEmail = "demo@papihairdesign.sk";
  const password = "PapiDemo2025!";

  const createUser = async (email: string, displayName: string) => {
    const existing = await auth.getUserByEmail(email).catch(() => null);
    if (existing) return existing.uid;
    const u = await auth.createUser({ email, password, displayName, emailVerified: true });
    return u.uid;
  };

  const ownerUid = await createUser(ownerEmail, "Demo Owner");
  const demoUid = await createUser(demoEmail, "Demo User");

  await db.doc(`profiles/${ownerUid}`).set(
    { email: ownerEmail, full_name: "Demo Owner", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { merge: true }
  );
  await db.doc(`profiles/${demoUid}`).set(
    { email: demoEmail, full_name: "Demo User", created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { merge: true }
  );
  await db.doc(`memberships/${membershipsDocId(ownerUid, businessId)}`).set(
    { profile_id: ownerUid, business_id: businessId, role: "owner", created_at: new Date().toISOString() },
    { merge: true }
  );
  await db.doc(`memberships/${membershipsDocId(demoUid, businessId)}`).set(
    { profile_id: demoUid, business_id: businessId, role: "employee", created_at: new Date().toISOString() },
    { merge: true }
  );

  return { success: true, message: "Demo účty vytvorené. Owner: owner@papihairdesign.sk, Zákazník: demo@papihairdesign.sk, heslo: PapiDemo2025!" };
});

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getAuth } from "firebase-admin/auth";

const SUPABASE_ROLE_CLAIM = "authenticated";

/**
 * Sets custom claim `role: 'authenticated'` for the current user so Supabase
 * Third-Party Auth (Firebase) accepts the JWT. Call once after sign-in;
 * merges with existing custom claims.
 */
export const ensureSupabaseRole = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Not signed in");
  const uid = request.auth.uid;
  const auth = getAuth();
  const userRecord = await auth.getUser(uid);
  const existing = (userRecord.customClaims as Record<string, unknown>) ?? {};
  if (existing.role === SUPABASE_ROLE_CLAIM) {
    return { ok: true, alreadySet: true };
  }
  await auth.setCustomUserClaims(uid, { ...existing, role: SUPABASE_ROLE_CLAIM });
  return { ok: true, alreadySet: false };
});

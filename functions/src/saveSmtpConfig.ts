import { onCall, HttpsError } from "firebase-functions/v2/https";
import { db, membershipsDocId } from "./lib/firestore.js";

export const saveSmtpConfig = onCall({ region: "europe-west1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Unauthorized");
  const uid = request.auth.uid;
  const business_id = request.data?.business_id as string;
  if (!business_id) throw new HttpsError("invalid-argument", "Missing business_id");
  const mid = membershipsDocId(uid, business_id);
  const memSnap = await db.doc(`memberships/${mid}`).get();
  const role = memSnap.data()?.role;
  if (role !== "owner" && role !== "admin") throw new HttpsError("permission-denied", "Forbidden – admin only");
  const bizRef = db.doc(`businesses/${business_id}`);
  const bizSnap = await bizRef.get();
  const existing = (bizSnap.data()?.smtp_config as Record<string, unknown>) ?? {};
  const host = typeof request.data?.host === "string" ? request.data.host.trim().slice(0, 255) : existing.host ?? "";
  const port = typeof request.data?.port === "number" ? request.data.port : existing.port ?? 465;
  const user = typeof request.data?.user === "string" ? request.data.user.trim().slice(0, 255) : existing.user ?? "";
  const from = typeof request.data?.from === "string" ? request.data.from.trim().slice(0, 255) : existing.from ?? "";
  const pass = typeof request.data?.pass === "string" && request.data.pass.length > 0 ? request.data.pass.slice(0, 500) : (existing.pass ?? "");
  const sanitized = { host, port, user, from, pass };
  await bizRef.update({ smtp_config: sanitized, updated_at: new Date().toISOString() });
  return { success: true };
});

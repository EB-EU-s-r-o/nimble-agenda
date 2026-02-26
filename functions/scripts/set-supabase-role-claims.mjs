/**
 * Sets custom claim role='authenticated' for all Firebase Auth users so Supabase
 * Third-Party Auth accepts their JWT. Use when Cloud Functions are not deployed (Spark plan).
 *
 * Prerequisites:
 * 1. Firebase Console → Project settings → Service accounts → Generate new private key.
 *    Save the JSON file (e.g. to project root as phd-booking-sa.json).
 * 2. Set env to the REAL path of that file (replace the path below with yours):
 *    $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\Users\42195\nimble-agenda\phd-booking-sa.json"
 * 3. Run: cd functions && node scripts/set-supabase-role-claims.mjs
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "phd-booking";
const CLAIM_ROLE = "authenticated";

const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!credPath || !existsSync(resolve(credPath))) {
  console.error("GOOGLE_APPLICATION_CREDENTIALS must point to your service account JSON file.");
  console.error("Current value:", credPath || "(not set)");
  console.error("1. Download key: Firebase Console → Project settings → Service accounts → Generate new private key");
  console.error("2. Save the file (e.g. phd-booking-sa.json in project root)");
  console.error("3. Set env (use the REAL path): $env:GOOGLE_APPLICATION_CREDENTIALS = \"C:\\path\\to\\phd-booking-sa.json\"");
  process.exit(1);
}

if (!getApps().length) {
  initializeApp({ projectId: PROJECT_ID });
}

const auth = getAuth();
let pageToken;
let total = 0;
let updated = 0;

do {
  const result = await auth.listUsers(1000, pageToken);
  for (const user of result.users) {
    const existing = (user.customClaims ?? {});
    if (existing.role === CLAIM_ROLE) continue;
    await auth.setCustomUserClaims(user.uid, { ...existing, role: CLAIM_ROLE });
    updated++;
    console.log("Set role claim for:", user.uid, user.email || "");
  }
  total += result.users.length;
  pageToken = result.pageToken;
} while (pageToken);

console.log("Done. Total users:", total, "Updated:", updated);

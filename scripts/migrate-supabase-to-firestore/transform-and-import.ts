/**
 * Load export/*.json, transform to Firestore shape, write in batches (500 ops/batch).
 * Requires: Firebase project (GOOGLE_APPLICATION_CREDENTIALS or gcloud auth application-default login).
 */
import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXPORT_DIR = join(__dirname, "export");

// Strip undefined, keep null; leave dates as ISO strings
function toFirestoreData(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined) continue;
    if (v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date)) {
      out[k] = toFirestoreData(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function loadExport(name: string): unknown[] {
  const path = join(EXPORT_DIR, `${name}.json`);
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, "utf-8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

async function main() {
  if (!existsSync(EXPORT_DIR)) {
    console.error("Run export-supabase.ts first to create export/");
    process.exit(1);
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath && existsSync(credPath)) {
    const cred = JSON.parse(readFileSync(credPath, "utf-8")) as ServiceAccount;
    initializeApp({ credential: cert(cred) });
  } else {
    initializeApp({ projectId: process.env.GCLOUD_PROJECT || "phd-booking" });
  }

  const db = getFirestore();
  const BATCH_SIZE = 500;

  const collections: { name: string; docIdField: "id" | "profile_business" | null }[] = [
    { name: "businesses", docIdField: "id" },
    { name: "business_hours", docIdField: "id" },
    { name: "business_date_overrides", docIdField: "id" },
    { name: "business_quick_links", docIdField: "id" },
    { name: "employees", docIdField: "id" },
    { name: "services", docIdField: "id" },
    { name: "schedules", docIdField: "id" },
    { name: "employee_services", docIdField: "id" },
    { name: "customers", docIdField: "id" },
    { name: "appointments", docIdField: "id" },
    { name: "booking_claims", docIdField: "id" },
    { name: "profiles", docIdField: "id" },
    { name: "memberships", docIdField: "profile_business" },
    { name: "passkeys", docIdField: "id" },
    { name: "sync_dedup", docIdField: "id" },
    { name: "onboarding_answers", docIdField: "id" },
    { name: "user_roles", docIdField: "id" },
  ];

  for (const { name, docIdField } of collections) {
    const rows = loadExport(name);
    if (rows.length === 0) {
      console.log(`${name}: (no data)`);
      continue;
    }

    const col = db.collection(name);
    let ops = 0;
    let batch = db.batch();
    let batchCount = 0;

    for (const row of rows as Record<string, unknown>[]) {
      const data = toFirestoreData(row);
      let docId: string;
      if (docIdField === "profile_business") {
        const profileId = String(data.profile_id ?? "");
        const businessId = String(data.business_id ?? "");
        docId = `${profileId}_${businessId}`;
      } else if (docIdField === "id" && data.id != null) {
        docId = String(data.id);
      } else {
        docId = (data.id as string) ?? col.doc().id;
      }
      const ref = col.doc(docId);
      batch.set(ref, data, { merge: false });
      ops++;
      if (ops >= BATCH_SIZE) {
        await batch.commit();
        batchCount++;
        batch = db.batch();
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();
    console.log(`${name}: ${rows.length} docs written${batchCount > 0 ? ` (${batchCount} full batches)` : ""}`);
  }

  console.log("Import done.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

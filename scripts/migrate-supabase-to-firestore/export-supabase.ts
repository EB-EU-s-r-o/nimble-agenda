/**
 * Export all Supabase tables to JSON files in export/.
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, "export");

const TABLES = [
  "businesses",
  "business_hours",
  "business_date_overrides",
  "business_quick_links",
  "employees",
  "services",
  "schedules",
  "employee_services",
  "customers",
  "appointments",
  "booking_claims",
  "profiles",
  "memberships",
  "passkeys",
  "sync_dedup",
  "onboarding_answers",
  "user_roles",
] as const;

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  for (const table of TABLES) {
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        console.warn(`Skip ${table}: ${error.message}`);
        continue;
      }
      const path = join(OUT_DIR, `${table}.json`);
      writeFileSync(path, JSON.stringify(data ?? [], null, 2), "utf-8");
      console.log(`${table}: ${(data ?? []).length} rows -> ${path}`);
    } catch (e) {
      console.warn(`Error ${table}:`, e);
    }
  }

  console.log("Export done.");
}

main();

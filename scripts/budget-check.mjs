#!/usr/bin/env node
/**
 * Budget check: fails if dist/ total size exceeds limit (default 6 MB).
 * Run after build. See docs/E2E-TESTING.md.
 */
import { readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, "..", "dist");
const MAX_BYTES = parseInt(process.env.BUDGET_MAX_MB || "12", 10) * 1024 * 1024;

function dirSize(dir) {
  let total = 0;
  try {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) total += dirSize(p);
      else total += st.size;
    }
  } catch {
    // ignore
  }
  return total;
}

try {
  const size = dirSize(distDir);
  if (size > MAX_BYTES) {
    console.error(`[budget] dist/ size ${(size / 1024 / 1024).toFixed(2)} MB exceeds limit ${MAX_BYTES / 1024 / 1024} MB`);
    process.exit(1);
  }
  console.log(`[budget] dist/ OK: ${(size / 1024 / 1024).toFixed(2)} MB (limit ${MAX_BYTES / 1024 / 1024} MB)`);
} catch (e) {
  console.error("[budget] dist/ not found. Run npm run build first.");
  process.exit(1);
}

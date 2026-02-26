#!/usr/bin/env node
/**
 * Lock-in check: ensures Node version satisfies package.json engines.node (e.g. >=18.0.0).
 * Cross-platform (no bash). See docs/E2E-TESTING.md.
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, "..", "package.json");
const raw = readFileSync(pkgPath, "utf8");
const pkg = JSON.parse(raw);
const engines = pkg.engines?.node;
if (!engines) {
  console.log("[lockin:check] No engines.node in package.json, skip.");
  process.exit(0);
}

const current = process.version.replace(/^v/, ""); // e.g. "20.10.0"
const [cMajor, cMinor = 0] = current.split(".").map(Number);

// Support ">=18.0.0" or "18.x" style
const match = engines.match(/>=(\d+)\.(\d+)/) || engines.match(/(\d+)\.x/);
if (!match) {
  console.log("[lockin:check] engines.node format not parsed:", engines);
  process.exit(0);
}
const [, minMajor, minMinor = 0] = match.map(Number);

const ok = cMajor > minMajor || (cMajor === minMajor && cMinor >= minMinor);
if (!ok) {
  console.error(`[lockin:check] Node ${process.version} does not satisfy ${engines} (required: >= ${minMajor}.${minMinor})`);
  process.exit(1);
}
console.log(`[lockin:check] Node ${process.version} OK (${engines})`);

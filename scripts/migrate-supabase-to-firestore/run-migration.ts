/**
 * Run export from Supabase then transform-and-import to Firestore.
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and Firebase credentials.
 */
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function run(script: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      ["tsx", join(__dirname, script)],
      { stdio: "inherit", shell: true, cwd: join(__dirname, "../..") }
    );
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${script} exited ${code}`))));
  });
}

async function main() {
  await run("export-supabase.ts");
  await run("transform-and-import.ts");
  console.log("Migration complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

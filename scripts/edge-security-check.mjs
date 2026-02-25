import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const repoRoot = process.cwd();

const configPath = join(repoRoot, 'supabase/config.toml');
const functionsRoot = join(repoRoot, 'supabase/functions');

const requiredJwtTrue = [
  'claim-booking',
  'sync-push',
  'sync-pull',
  'webauthn-register',
  'send-booking-email',
  'save-smtp-config',
  'seed-demo-accounts',
];

const expectedJwtFalse = [
  'create-public-booking',
  'webauthn-authenticate',
];

const requiredCorsHelper = [
  'claim-booking',
  'sync-push',
  'sync-pull',
  'webauthn-register',
  'webauthn-authenticate',
  'send-booking-email',
  'save-smtp-config',
  'seed-demo-accounts',
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function parseFunctionJwt(config, fnName) {
  const sectionRegex = new RegExp(`\\[functions\\.${fnName}\\]([\\s\\S]*?)(?=\\n\\[|$)`);
  const sectionMatch = config.match(sectionRegex);
  assert(sectionMatch, `Missing [functions.${fnName}] section in supabase/config.toml`);

  const verifyMatch = sectionMatch[1].match(/verify_jwt\s*=\s*(true|false)/);
  assert(verifyMatch, `Missing verify_jwt for function: ${fnName}`);
  return verifyMatch[1] === 'true';
}

const configToml = readFileSync(configPath, 'utf8');

for (const fnName of requiredJwtTrue) {
  assert(parseFunctionJwt(configToml, fnName) === true, `Expected verify_jwt = true for ${fnName}`);
}

for (const fnName of expectedJwtFalse) {
  assert(parseFunctionJwt(configToml, fnName) === false, `Expected verify_jwt = false for ${fnName}`);
}

for (const fnName of requiredCorsHelper) {
  const filePath = join(functionsRoot, fnName, 'index.ts');
  const content = readFileSync(filePath, 'utf8');

  assert(!content.includes('"Access-Control-Allow-Origin": "*"'), `Wildcard CORS header found in ${fnName}`);
  assert(content.includes('../_shared/cors.ts'), `Missing shared CORS helper import in ${fnName}`);
  assert(content.includes('isAllowedOrigin('), `Missing isAllowedOrigin() gate in ${fnName}`);
  assert(content.includes('buildCorsHeaders('), `Missing buildCorsHeaders() usage in ${fnName}`);
}

console.log('Edge security checks passed.');

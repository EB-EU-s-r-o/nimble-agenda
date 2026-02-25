import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260224120000_reservation_email_notifications.sql'),
  'utf8'
);
const functionCode = readFileSync(
  join(process.cwd(), 'supabase/functions/send-booking-email/index.ts'),
  'utf8'
);

// Trigger flow coverage: create / update / cancel
assert(migration.includes("event_type := 'reservation.created';"), 'Missing created event mapping in trigger');
assert(migration.includes("event_type := 'reservation.updated';"), 'Missing updated event mapping in trigger');
assert(migration.includes("event_type := 'reservation.cancelled';"), 'Missing cancelled event mapping in trigger');

// DB trigger dispatch to edge function with service role auth
assert(migration.includes("/functions/v1/send-booking-email"), 'Trigger does not call send-booking-email endpoint');
assert(migration.includes("'Authorization', 'Bearer ' || service_role_key"), 'Trigger is not sending service-role Authorization header');
assert(migration.includes("'apikey', service_role_key"), 'Trigger is not sending service-role apikey header');

// Edge function should accept internal service-role invocations
assert(functionCode.includes('isServiceRoleInvocation'), 'send-booking-email lacks service-role invocation path');
assert(functionCode.includes('if (!isServiceRoleInvocation)'), 'send-booking-email does not preserve caller auth path for user invocations');

console.log('send-booking-email trigger smoke checks passed.');

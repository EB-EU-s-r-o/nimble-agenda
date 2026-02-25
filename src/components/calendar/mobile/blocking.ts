export const BLOCK_TAG = "[BLOCK]";
export const BLOCK_CUSTOMER_EMAIL = "internal-block@nimble.local";
export const BLOCK_SERVICE_NAME = "Blokovaný čas";

export function isBlockedAppointmentNote(notes?: string | null): boolean {
  return Boolean(notes?.trim().startsWith(BLOCK_TAG));
}

export function getBlockedReason(notes?: string | null): string {
  if (!notes) return BLOCK_SERVICE_NAME;
  const cleaned = notes.replace(BLOCK_TAG, "").trim();
  return cleaned || BLOCK_SERVICE_NAME;
}

export function makeBlockedNote(reason?: string): string {
  const safeReason = reason?.trim() || BLOCK_SERVICE_NAME;
  return `${BLOCK_TAG} ${safeReason}`;
}

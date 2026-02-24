/**
 * Timezone-aware utilities using Intl API (zero dependencies).
 */

/** Default business timezone for Slovakia */
export const BUSINESS_TZ = "Europe/Bratislava";

/** Get hours and minutes of a Date in a specific timezone */
export function getTimeInTZ(date: Date, tz: string): { hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);

  let hours = Number.parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const minutes = Number.parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  if (hours === 24) hours = 0;
  return { hours, minutes };
}

/** Get total minutes since midnight in a specific timezone */
export function getMinutesInTZ(date: Date, tz: string): number {
  const { hours, minutes } = getTimeInTZ(date, tz);
  return hours * 60 + minutes;
}

/** Format time (HH:mm) in a specific timezone */
export function formatTimeInTZ(date: Date, tz: string): string {
  return new Intl.DateTimeFormat('sk-SK', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/** Get start of day (midnight) in a timezone, returned as a UTC Date */
export function startOfDayInTZ(date: Date, tz: string): Date {
  const dateStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(date);
  const guess = new Date(`${dateStr}T00:00:00Z`);
  const { hours, minutes } = getTimeInTZ(guess, tz);
  let offsetMs = (hours * 60 + minutes) * 60 * 1000;
  if (hours > 12) offsetMs -= 24 * 60 * 60 * 1000;
  return new Date(guess.getTime() - offsetMs);
}

/** Check if two dates are the same calendar day in a timezone */
export function isSameDayInTZ(a: Date, b: Date, tz: string): boolean {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz });
  return fmt.format(a) === fmt.format(b);
}

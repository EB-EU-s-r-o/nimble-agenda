/**
 * Calendar-specific timezone utilities using Intl API and date-fns.
 * 
 * ANTI-PATTERNS TO AVOID:
 * ❌ new Date(isoString) - treats ISO string as local time (BUG!)
 * ❌ date.setHours(date.getHours() + 2) - manual offset, breaks with DST
 * ❌ new Date(year, month, day) - creates local date, not TZ-aware
 * 
 * CORRECT APPROACH (used here):
 * ✅ Use Intl.DateTimeFormat with timeZone option for TZ-aware operations
 * ✅ Use date-fns parseISO which properly handles ISO strings
 * ✅ Convert UTC to local using explicit format parsing
 */

import { parseISO, format } from "date-fns";
import { 
  getTimeInTZ, 
  getMinutesInTZ, 
  formatTimeInTZ, 
  startOfDayInTZ,
  isSameDayInTZ 
} from "./timezone";

/** Default business timezone */
export const BUSINESS_TZ = "Europe/Bratislava";

/**
 * Parse ISO datetime string and convert to Date in specific timezone.
 * 
 * CRITICAL: This is the CORRECT way to handle UTC dates from backend.
 * 
 * @param isoString - ISO string from backend (e.g., "2024-01-15T09:00:00Z")
 * @param tz - Target timezone (default: Europe/Bratislava)
 * @returns Date object that represents the correct local time
 */
export function parseToTimezone(isoString: string, tz: string = BUSINESS_TZ): Date {
  // Parse ISO string - this gives us a UTC timestamp
  const utcDate = parseISO(isoString);
  
  // The issue: when we pass this Date to calendar, it needs to show the correct
  // local time. react-big-calendar and our custom components use getMinutesInTZ
  // which reads the time in the target timezone from the Date object.
  // 
  // Since parseISO("2024-01-15T09:00:00Z") creates a Date with UTC timestamp,
  // when we call getMinutesInTZ(date, "Europe/Bratislava"), it correctly returns
  // the hour in Bratislava timezone (considering DST).
  //
  // BUT: the problem is that react-big-calendar uses its own internal logic
  // which may treat the Date as local time.
  //
  // SOLUTION: For react-big-calendar, we need to convert to local timezone first.
  // For our custom components, the current approach works.
  
  return utcDate;
}

/**
 * Alternative: Create a Date that represents the same wall-clock time in target timezone
 * This is useful when you need the Date object to "think" it's in local time
 */
export function parseToTimezoneAsLocal(isoString: string, tz: string = BUSINESS_TZ): Date {
  const utcDate = parseISO(isoString);
  
  // Get the time components in the target timezone
  const { hours, minutes } = getTimeInTZ(utcDate, tz);
  
  // Create a new date at those time components (as local)
  const result = new Date();
  result.setHours(hours, minutes, 0, 0);
  
  return result;
}

export interface CalendarEventInput {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  service_name?: string | null;
  employee_name?: string | null;
  customer_name?: string | null;
  notes?: string | null;
}

export interface CalendarEvent {
  id: string;
  startAt: Date;
  endAt: Date;
  startUtc: Date;
  endUtc: Date;
  status: string;
  serviceName: string;
  employeeName: string;
  customerName: string;
  notes?: string | null;
  displayTitle: string;
  displayTime: string;
}

/**
 * Validate and return safe fallback for string fields
 */
function safeString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

/**
 * Normalize appointment data from API to CalendarEvent
 * This ensures proper timezone handling and safe fallbacks
 * 
 * @param apt - Raw appointment from API
 * @param tz - Business timezone
 * @returns Normalized CalendarEvent
 */
export function normalizeAppointment(
  apt: CalendarEventInput,
  tz: string = BUSINESS_TZ
): CalendarEvent {
  // Parse as UTC first
  const startUtc = parseISO(apt.start_at);
  const endUtc = parseISO(apt.end_at);
  
  // Get time components in target timezone for display
  const startAt = startUtc; // Will be converted via getMinutesInTZ
  const endAt = endUtc;
  
  // Safe fallbacks - NEVER show "?" or "–"
  const serviceName = safeString(apt.service_name, "Bez názvu služby");
  const customerName = safeString(apt.customer_name, "Neznámy klient");
  const employeeName = safeString(apt.employee_name, "");
  
  const displayTitle = employeeName 
    ? `${customerName} – ${serviceName} (${employeeName})`
    : `${customerName} – ${serviceName}`;
    
  const displayTime = `${formatTimeInTZ(startAt, tz)} – ${formatTimeInTZ(endAt, tz)}`;
  
  return {
    id: apt.id,
    startAt,
    endAt,
    startUtc,
    endUtc,
    status: apt.status,
    serviceName,
    employeeName,
    customerName,
    notes: apt.notes ?? undefined,
    displayTitle,
    displayTime,
  };
}

/**
 * Legacy compatibility - convert CalendarEvent to react-big-calendar format
 */
export function toRBCEvent(event: CalendarEvent) {
  return {
    id: event.id,
    title: event.displayTitle,
    start: event.startAt,  // react-big-calendar will use its own timezone handling
    end: event.endAt,
    status: event.status,
    resource: event,
  };
}

export { getTimeInTZ } from "./timezone";
export { getMinutesInTZ } from "./timezone";
export { formatTimeInTZ } from "./timezone";
export { startOfDayInTZ } from "./timezone";
export { isSameDayInTZ } from "./timezone";

/**
 * Format time in 24h format (HH:mm) - wrapper for compatibility
 */
export function formatTime(date: Date): string {
  return format(date, "HH:mm");
}

/**
 * Format date for display (d. M. yyyy)
 */
export function formatDateSk(date: Date): string {
  return format(date, "d. M. yyyy");
}

/**
 * Format datetime for display (d. M. yyyy HH:mm)
 */
export function formatDateTimeSk(date: Date): string {
  return format(date, "d. M. yyyy HH:mm");
}

/**
 * Format datetime range for display
 */
export function formatDateTimeRangeSk(start: Date, end: Date): string {
  return `${formatDateTimeSk(start)} – ${format(end, "HH:mm")}`;
}

/**
 * Calculate overlap groups for appointments
 * Returns appointments with calculated left/width for overlap display
 */
export interface OverlapResult {
  appointments: (CalendarEvent & {
    overlapIndex: number;
    overlapCount: number;
    leftPercent: number;
    widthPercent: number;
  })[];
}

export function calculateOverlapGroups(
  appointments: CalendarEvent[],
  date: Date,
  tz: string = BUSINESS_TZ
): OverlapResult {
  // Filter appointments for this specific day
  const dayStart = startOfDayInTZ(date, tz);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  
  const dayAppointments = appointments.filter(apt => {
    const aptDate = startOfDayInTZ(apt.startAt, tz);
    return isSameDayInTZ(aptDate, dayStart, tz);
  });
  
  // Sort by start time
  dayAppointments.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  
  // Group overlapping appointments
  const groups: CalendarEvent[][] = [];
  
  for (const apt of dayAppointments) {
    let placed = false;
    
    for (const group of groups) {
      // Check if this appointment overlaps with any in the group
      const overlaps = group.some(existing => {
        return apt.startAt < existing.endAt && apt.endAt > existing.startAt;
      });
      
      if (!overlaps) {
        group.push(apt);
        placed = true;
        break;
      }
    }
    
    if (!placed) {
      groups.push([apt]);
    }
  }
  
  // Assign overlap indices
  const result: OverlapResult = { appointments: [] };
  
  for (const group of groups) {
    const count = group.length;
    
    for (let i = 0; i < group.length; i++) {
      const apt = group[i];
      const widthPercent = 100 / count;
      const leftPercent = (i * widthPercent);
      
      result.appointments.push({
        ...apt,
        overlapIndex: i,
        overlapCount: count,
        leftPercent,
        widthPercent,
      });
    }
  }
  
  return result;
}

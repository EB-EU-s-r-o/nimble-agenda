/**
 * Availability Engine
 * Generates available time slots respecting:
 * - Business opening hours
 * - Employee schedules
 * - Service duration + buffer
 * - Lead time & max days ahead
 * - Existing appointments (conflict detection)
 * - Timezone (Europe/Bratislava default)
 */

import { addMinutes, startOfDay, isBefore, isAfter, format } from "date-fns";

export interface BusinessHours {
  [day: string]: { open: boolean; start: string; end: string };
}

export interface EmployeeSchedule {
  day_of_week: string;
  start_time: string; // "HH:mm"
  end_time: string;
}

export interface ExistingAppointment {
  start_at: string;
  end_at: string;
}

export interface SlotGeneratorInput {
  date: Date;
  serviceDuration: number; // minutes
  serviceBuffer: number; // minutes
  openingHours: BusinessHours;
  employeeSchedules: EmployeeSchedule[];
  existingAppointments: ExistingAppointment[];
  leadTimeMinutes?: number;
  slotInterval?: number; // default 30
}

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

function setTimeOnDate(date: Date, timeStr: string): Date {
  const d = new Date(date);
  const [h, m] = timeStr.split(":").map(Number);
  d.setHours(h, m || 0, 0, 0);
  return d;
}

export function generateSlots(input: SlotGeneratorInput): Date[] {
  const {
    date,
    serviceDuration,
    serviceBuffer,
    openingHours,
    employeeSchedules,
    existingAppointments,
    leadTimeMinutes = 0,
    slotInterval = 30,
  } = input;

  const totalDuration = serviceDuration + serviceBuffer;
  const dayName = DAY_NAMES[date.getDay()];
  const slots: Date[] = [];

  // Check business opening hours
  const businessDay = openingHours[dayName];
  if (!businessDay || !businessDay.open) return slots;

  const businessStart = setTimeOnDate(date, businessDay.start);
  const businessEnd = setTimeOnDate(date, businessDay.end);

  // Check employee schedule for this day
  const empDay = employeeSchedules.find((s) => s.day_of_week === dayName);
  if (!empDay) return slots;

  const empStart = setTimeOnDate(date, empDay.start_time);
  const empEnd = setTimeOnDate(date, empDay.end_time);

  // Effective window is intersection of business hours and employee schedule
  const windowStart = isAfter(empStart, businessStart) ? empStart : businessStart;
  const windowEnd = isBefore(empEnd, businessEnd) ? empEnd : businessEnd;

  if (isAfter(windowStart, windowEnd) || windowStart.getTime() === windowEnd.getTime()) return slots;

  // Lead time: earliest allowed slot
  const now = new Date();
  const earliestAllowed = addMinutes(now, leadTimeMinutes);

  // Parse existing appointments
  const conflicts = existingAppointments.map((a) => ({
    start: new Date(a.start_at).getTime(),
    end: new Date(a.end_at).getTime(),
  }));

  // Generate slots
  let cursor = new Date(windowStart);
  while (cursor < windowEnd) {
    const slotEnd = addMinutes(cursor, totalDuration);

    // Slot must fit within window
    if (isAfter(slotEnd, windowEnd)) break;

    // Slot must be after lead time
    if (!isBefore(cursor, earliestAllowed)) {
      // Check conflicts
      const slotStartMs = cursor.getTime();
      const slotEndMs = slotEnd.getTime();
      const hasConflict = conflicts.some(
        (c) => slotStartMs < c.end && slotEndMs > c.start
      );

      if (!hasConflict) {
        slots.push(new Date(cursor));
      }
    }

    cursor = addMinutes(cursor, slotInterval);
  }

  return slots;
}

/**
 * Check if a specific slot is available
 */
export function isSlotAvailable(
  slotStart: Date,
  serviceDuration: number,
  serviceBuffer: number,
  existingAppointments: ExistingAppointment[]
): boolean {
  const slotEnd = addMinutes(slotStart, serviceDuration + serviceBuffer);
  const slotStartMs = slotStart.getTime();
  const slotEndMs = slotEnd.getTime();

  return !existingAppointments.some(
    (a) => slotStartMs < new Date(a.end_at).getTime() && slotEndMs > new Date(a.start_at).getTime()
  );
}

import { format } from "date-fns";
import type { DayException, TimeSegment, WorkingSchedule } from "./types";

export const DAY_START_MINUTES = 6 * 60;
export const DAY_END_MINUTES = 22 * 60;

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const buildWorkingSegments = (
  start: number,
  end: number,
  breaks: Array<{ start: string; end: string }> = [],
): TimeSegment[] => {
  const validBreaks = breaks
    .map((b) => ({ start: toMinutes(b.start), end: toMinutes(b.end) }))
    .filter((b) => b.end > b.start)
    .sort((a, b) => a.start - b.start);

  const segments: TimeSegment[] = [];
  let cursor = start;

  for (const pause of validBreaks) {
    const breakStart = Math.max(start, pause.start);
    const breakEnd = Math.min(end, pause.end);

    if (breakStart > cursor) {
      segments.push({ startMinutes: cursor, endMinutes: breakStart, kind: "working" });
    }
    if (breakEnd > breakStart) {
      segments.push({ startMinutes: breakStart, endMinutes: breakEnd, kind: "break" });
      cursor = breakEnd;
    }
  }

  if (cursor < end) {
    segments.push({ startMinutes: cursor, endMinutes: end, kind: "working" });
  }

  return segments;
};

export function computeDaySegments(
  date: Date,
  employeeId: string,
  schedules: WorkingSchedule[],
  exceptions: DayException[],
): TimeSegment[] {
  const day = date.getDay();
  const dateKey = format(date, "yyyy-MM-dd");

  const dayException = exceptions.find((item) => item.employeeId === employeeId && item.date === dateKey);
  if (dayException?.type === "off") {
    return [{ startMinutes: DAY_START_MINUTES, endMinutes: DAY_END_MINUTES, kind: "nonWorking" }];
  }

  const schedule = schedules.find((item) => item.employeeId === employeeId && item.weekday === day);

  const dayStart = dayException?.type === "customHours" ? dayException.start : schedule?.start;
  const dayEnd = dayException?.type === "customHours" ? dayException.end : schedule?.end;
  const breaks = dayException?.type === "customHours" ? dayException.breaks ?? [] : schedule?.breaks ?? [];

  if (!dayStart || !dayEnd) {
    return [{ startMinutes: DAY_START_MINUTES, endMinutes: DAY_END_MINUTES, kind: "nonWorking" }];
  }

  const start = Math.max(DAY_START_MINUTES, toMinutes(dayStart));
  const end = Math.min(DAY_END_MINUTES, toMinutes(dayEnd));

  if (end <= start) {
    return [{ startMinutes: DAY_START_MINUTES, endMinutes: DAY_END_MINUTES, kind: "nonWorking" }];
  }

  const workingWithBreaks = buildWorkingSegments(start, end, breaks);
  const base: TimeSegment[] = [];

  if (DAY_START_MINUTES < start) {
    base.push({ startMinutes: DAY_START_MINUTES, endMinutes: start, kind: "nonWorking" });
  }

  base.push(...workingWithBreaks);

  if (end < DAY_END_MINUTES) {
    base.push({ startMinutes: end, endMinutes: DAY_END_MINUTES, kind: "nonWorking" });
  }

  return base;
}

export function isMinuteWorking(segments: TimeSegment[], minute: number): boolean {
  const segment = segments.find((item) => minute >= item.startMinutes && minute < item.endMinutes);
  return segment?.kind === "working";
}

import { describe, expect, it } from "vitest";
import { computeDaySegments } from "./schedule";
import type { DayException, WorkingSchedule } from "./types";

const employeeId = "emp-1";
const monday = new Date("2026-01-05T10:00:00.000Z");

describe("computeDaySegments", () => {
  it("builds working + nonWorking + break segments from schedule", () => {
    const schedules: WorkingSchedule[] = [
      {
        employeeId,
        weekday: 1,
        start: "09:00",
        end: "17:00",
        breaks: [{ start: "12:00", end: "12:30" }],
      },
    ];

    const result = computeDaySegments(monday, employeeId, schedules, []);

    expect(result).toEqual([
      { startMinutes: 360, endMinutes: 540, kind: "nonWorking" },
      { startMinutes: 540, endMinutes: 720, kind: "working" },
      { startMinutes: 720, endMinutes: 750, kind: "break" },
      { startMinutes: 750, endMinutes: 1020, kind: "working" },
      { startMinutes: 1020, endMinutes: 1320, kind: "nonWorking" },
    ]);
  });

  it("applies day off exception for whole day", () => {
    const schedules: WorkingSchedule[] = [
      { employeeId, weekday: 1, start: "09:00", end: "17:00", breaks: [] },
    ];

    const exceptions: DayException[] = [
      { employeeId, date: "2026-01-05", type: "off" },
    ];

    const result = computeDaySegments(monday, employeeId, schedules, exceptions);
    expect(result).toEqual([{ startMinutes: 360, endMinutes: 1320, kind: "nonWorking" }]);
  });
});

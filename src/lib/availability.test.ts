import { describe, it, expect } from "vitest";
import { format } from "date-fns";
import {
  getEffectiveIntervals,
  generateSlots,
  isSlotAvailable,
  type BusinessHours,
  type BusinessHourEntry,
  type DateOverrideEntry,
  type EmployeeSchedule,
  type ExistingAppointment,
} from "./availability";

describe("getEffectiveIntervals", () => {
  it("returns null when no hours configured", () => {
    const d = new Date("2026-02-26");
    expect(getEffectiveIntervals(d)).toBeNull();
  });

  it("returns open interval from legacy openingHours", () => {
    const d = new Date("2026-02-26"); // Thursday
    const hours: BusinessHours = {
      thursday: { open: true, start: "09:00", end: "17:00" },
    };
    const r = getEffectiveIntervals(d, undefined, undefined, hours);
    expect(r).toEqual([{ start: "09:00", end: "17:00" }]);
  });

  it("returns null when day closed in legacy hours", () => {
    const d = new Date("2026-02-26");
    const hours: BusinessHours = { thursday: { open: false, start: "09:00", end: "17:00" } };
    expect(getEffectiveIntervals(d, undefined, undefined, hours)).toBeNull();
  });

  it("uses businessHourEntries when provided", () => {
    const d = new Date("2026-02-26");
    const entries: BusinessHourEntry[] = [
      { day_of_week: "thursday", mode: "open", start_time: "08:00", end_time: "16:00" },
    ];
    const r = getEffectiveIntervals(d, entries);
    expect(r).toEqual([{ start: "08:00", end: "16:00" }]);
  });

  it("returns null for closed in businessHourEntries", () => {
    const d = new Date("2026-02-26");
    const entries: BusinessHourEntry[] = [
      { day_of_week: "thursday", mode: "closed", start_time: "00:00", end_time: "00:00" },
    ];
    expect(getEffectiveIntervals(d, entries)).toBeNull();
  });

  it("date override closed wins", () => {
    const d = new Date("2026-02-26");
    const overrides: DateOverrideEntry[] = [
      { override_date: "2026-02-26", mode: "closed", start_time: null, end_time: null },
    ];
    const hours: BusinessHours = { thursday: { open: true, start: "09:00", end: "17:00" } };
    expect(getEffectiveIntervals(d, undefined, overrides, hours)).toBeNull();
  });
});

describe("generateSlots", () => {
  const thursday = new Date("2026-02-26T12:00:00.000Z");
  const openingHours: BusinessHours = {
    thursday: { open: true, start: "09:00", end: "18:00" },
  };
  const employeeSchedules: EmployeeSchedule[] = [
    { day_of_week: "thursday", start_time: "09:00", end_time: "18:00" },
  ];

  it("returns empty when no intervals", () => {
    const slots = generateSlots({
      date: thursday,
      serviceDuration: 60,
      serviceBuffer: 0,
      openingHours: {},
      employeeSchedules,
      existingAppointments: [],
    });
    expect(slots).toEqual([]);
  });

  it("returns slots when open and no conflicts", () => {
    const slots = generateSlots({
      date: thursday,
      serviceDuration: 30,
      serviceBuffer: 0,
      openingHours,
      employeeSchedules,
      existingAppointments: [],
      slotInterval: 60,
    });
    expect(Array.isArray(slots)).toBe(true);
    slots.forEach((s) => expect(s).toBeInstanceOf(Date));
  });

  it("excludes slots that conflict with existing appointments", () => {
    const dayStr = format(thursday, "yyyy-MM-dd");
    const slots = generateSlots({
      date: thursday,
      serviceDuration: 60,
      serviceBuffer: 0,
      openingHours,
      employeeSchedules,
      existingAppointments: [
        { start_at: `${dayStr}T10:00:00.000Z`, end_at: `${dayStr}T11:00:00.000Z` },
      ],
      slotInterval: 60,
    });
    const slotStrs = slots.map((s) => s.toISOString());
    const hasDuringConflict = slotStrs.some(
      (t) => t.includes("T10:00") || t.includes("T09:00")
    );
    expect(hasDuringConflict).toBe(false);
  });
});

describe("isSlotAvailable", () => {
  it("returns true when no appointments", () => {
    const start = new Date("2026-02-26T10:00:00.000Z");
    expect(isSlotAvailable(start, 60, 0, [])).toBe(true);
  });

  it("returns false when slot overlaps existing", () => {
    const start = new Date("2026-02-26T10:00:00.000Z");
    const existing: ExistingAppointment[] = [
      { start_at: "2026-02-26T10:30:00.000Z", end_at: "2026-02-26T11:30:00.000Z" },
    ];
    expect(isSlotAvailable(start, 60, 0, existing)).toBe(false);
  });

  it("returns true when slot does not overlap", () => {
    const start = new Date("2026-02-26T10:00:00.000Z");
    const existing: ExistingAppointment[] = [
      { start_at: "2026-02-26T12:00:00.000Z", end_at: "2026-02-26T13:00:00.000Z" },
    ];
    expect(isSlotAvailable(start, 60, 0, existing)).toBe(true);
  });
});

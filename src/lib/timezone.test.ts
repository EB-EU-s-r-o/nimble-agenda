import { describe, it, expect } from "vitest";
import {
  BUSINESS_TZ,
  getTimeInTZ,
  getMinutesInTZ,
  formatTimeInTZ,
  isSameDayInTZ,
  startOfDayInTZ,
} from "./timezone";

describe("timezone", () => {
  it("exports BUSINESS_TZ as Europe/Bratislava", () => {
    expect(BUSINESS_TZ).toBe("Europe/Bratislava");
  });

  it("getTimeInTZ returns hours and minutes for UTC noon", () => {
    const d = new Date("2026-02-26T12:00:00.000Z");
    const t = getTimeInTZ(d, "Europe/Bratislava");
    expect(t.hours).toBeGreaterThanOrEqual(0);
    expect(t.hours).toBeLessThanOrEqual(23);
    expect(t.minutes).toBeGreaterThanOrEqual(0);
    expect(t.minutes).toBeLessThan(60);
  });

  it("getMinutesInTZ returns number between 0 and 1439", () => {
    const d = new Date("2026-02-26T15:30:00.000Z");
    const m = getMinutesInTZ(d, "UTC");
    expect(m).toBeGreaterThanOrEqual(0);
    expect(m).toBeLessThan(24 * 60);
  });

  it("formatTimeInTZ returns HH:mm format", () => {
    const d = new Date("2026-02-26T14:05:00.000Z");
    const s = formatTimeInTZ(d, "UTC");
    expect(/^\d{1,2}:\d{2}$/.test(s)).toBe(true);
  });

  it("isSameDayInTZ returns true for same calendar day", () => {
    const a = new Date("2026-02-26T10:00:00.000Z");
    const b = new Date("2026-02-26T23:00:00.000Z");
    expect(isSameDayInTZ(a, b, "UTC")).toBe(true);
  });

  it("isSameDayInTZ returns false for different days", () => {
    const a = new Date("2026-02-26T23:00:00.000Z");
    const b = new Date("2026-02-27T01:00:00.000Z");
    expect(isSameDayInTZ(a, b, "UTC")).toBe(false);
  });

  it("startOfDayInTZ returns a Date", () => {
    const d = new Date("2026-02-26T14:00:00.000Z");
    const start = startOfDayInTZ(d, "UTC");
    expect(start).toBeInstanceOf(Date);
  });
});

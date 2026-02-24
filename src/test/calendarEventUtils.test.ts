import { describe, expect, it } from "vitest";
import {
  formatTimeRangeFromUtc,
  normalizeAppointmentEvent,
  parseApiDateToUtc,
} from "@/lib/calendarEventUtils";

describe("calendarEventUtils", () => {
  it("parses ISO with explicit UTC offset", () => {
    const parsed = parseApiDateToUtc("2025-03-10T09:00:00Z");
    expect(parsed.toISO()).toBe("2025-03-10T09:00:00.000Z");
  });

  it("parses ISO without offset in Europe/Bratislava timezone", () => {
    const parsed = parseApiDateToUtc("2025-03-10T09:00:00", "Europe/Bratislava");
    expect(parsed.toISO()).toBe("2025-03-10T08:00:00.000Z");
  });

  it("formats range in timezone with DST", () => {
    const beforeDst = formatTimeRangeFromUtc("2025-03-29T08:00:00Z", "2025-03-29T08:25:00Z", "Europe/Bratislava");
    const afterDst = formatTimeRangeFromUtc("2025-03-31T08:00:00Z", "2025-03-31T08:25:00Z", "Europe/Bratislava");

    expect(beforeDst).toBe("9:00 - 9:25");
    expect(afterDst).toBe("10:00 - 10:25");
  });

  it("normalizes fallbacks without placeholder question marks", () => {
    const normalized = normalizeAppointmentEvent({
      id: "a1",
      start_at: "2025-03-10T09:00:00Z",
      end_at: "2025-03-10T09:25:00Z",
      status: "confirmed",
      customers: null,
      services: null,
      employees: null,
    });

    expect(normalized.displayTitle).toBe("Neznámy klient • Bez názvu služby");
    expect(normalized.employeeName).toBe("Nepriradený zamestnanec");
    expect(normalized.displayTimeRange).toBe("10:00 - 10:25");
  });
});

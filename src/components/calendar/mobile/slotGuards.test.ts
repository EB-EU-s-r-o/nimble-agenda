import { describe, expect, it } from "vitest";
import { canBookSlot, isSlotBlockedByEvents } from "./slotGuards";
import type { CalendarEvent } from "./types";

const events: CalendarEvent[] = [
  {
    id: "b1",
    employeeId: "e1",
    start: "2026-01-05T10:00:00.000Z",
    end: "2026-01-05T11:00:00.000Z",
    title: "Pauza",
    type: "blocked",
    status: "confirmed",
  },
];

describe("slot guards", () => {
  it("detects blocked slot from events", () => {
    expect(isSlotBlockedByEvents(new Date("2026-01-05T10:30:00.000Z"), events)).toBe(true);
    expect(isSlotBlockedByEvents(new Date("2026-01-05T11:30:00.000Z"), events)).toBe(false);
  });

  it("bookability requires working and not blocked", () => {
    expect(canBookSlot({ slotWorking: true, slotBlocked: false })).toBe(true);
    expect(canBookSlot({ slotWorking: false, slotBlocked: false })).toBe(false);
    expect(canBookSlot({ slotWorking: true, slotBlocked: true })).toBe(false);
  });
});

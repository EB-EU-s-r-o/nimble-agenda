import type { CalendarEvent } from "./types";

export function isSlotBlockedByEvents(slotTime: Date, events: CalendarEvent[]): boolean {
  const slot = slotTime.getTime();
  return events.some((event) => {
    if (event.type !== "blocked") return false;
    const start = new Date(event.start).getTime();
    const end = new Date(event.end).getTime();
    return slot >= start && slot < end;
  });
}

export function canBookSlot(params: { slotWorking: boolean; slotBlocked: boolean }): boolean {
  return params.slotWorking && !params.slotBlocked;
}

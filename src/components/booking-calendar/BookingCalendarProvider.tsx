import type { ReactNode } from "react";
import { BookingCalendarContext } from "./calendar-context";
import type { BookingCalendarEvent, BookingCalendarMode } from "./calendar-types";
import type { SlotInfo } from "./calendar-context";

export interface BookingCalendarProviderProps {
  events: BookingCalendarEvent[];
  date: Date;
  setDate: (date: Date) => void;
  mode: BookingCalendarMode;
  setMode: (mode: BookingCalendarMode) => void;
  onSelectSlot?: (slot: SlotInfo) => void;
  onSelectEvent?: (event: BookingCalendarEvent) => void;
  selectable: boolean;
  children: ReactNode;
}

export function BookingCalendarProvider({
  events,
  date,
  setDate,
  mode,
  setMode,
  onSelectSlot,
  onSelectEvent,
  selectable,
  children,
}: BookingCalendarProviderProps) {
  return (
    <BookingCalendarContext.Provider
      value={{
        events,
        date,
        setDate,
        mode,
        setMode,
        onSelectSlot,
        onSelectEvent,
        selectable,
      }}
    >
      {children}
    </BookingCalendarContext.Provider>
  );
}

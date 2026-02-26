import { createContext, useContext } from "react";
import type { BookingCalendarEvent, BookingCalendarMode } from "./calendar-types";

export interface SlotInfo {
  start: Date;
  end: Date;
}

export interface BookingCalendarContextValue {
  events: BookingCalendarEvent[];
  date: Date;
  setDate: (date: Date) => void;
  mode: BookingCalendarMode;
  setMode: (mode: BookingCalendarMode) => void;
  onSelectSlot?: (slot: SlotInfo) => void;
  onSelectEvent?: (event: BookingCalendarEvent) => void;
  selectable: boolean;
}

export const BookingCalendarContext =
  createContext<BookingCalendarContextValue | undefined>(undefined);

export function useBookingCalendarContext() {
  const ctx = useContext(BookingCalendarContext);
  if (!ctx) {
    throw new Error(
      "useBookingCalendarContext must be used within BookingCalendarProvider"
    );
  }
  return ctx;
}

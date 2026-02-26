import type { BookingCalendarEvent, BookingCalendarMode } from "./calendar-types";
import type { SlotInfo } from "./calendar-context";
import { BookingCalendarProvider } from "./BookingCalendarProvider";
import { CalendarHeader } from "./header/CalendarHeader";
import { CalendarHeaderDate } from "./header/CalendarHeaderDate";
import { CalendarHeaderMode } from "./header/CalendarHeaderMode";
import { CalendarHeaderAdd } from "./header/CalendarHeaderAdd";
import { CalendarBody } from "./body/CalendarBody";

export interface BookingCalendarProps {
  events: BookingCalendarEvent[];
  date: Date;
  setDate: (date: Date) => void;
  mode: BookingCalendarMode;
  setMode: (mode: BookingCalendarMode) => void;
  onSelectSlot?: (slot: SlotInfo) => void;
  onSelectEvent?: (event: BookingCalendarEvent) => void;
  selectable?: boolean;
}

export function BookingCalendar({
  events,
  date,
  setDate,
  mode,
  setMode,
  onSelectSlot,
  onSelectEvent,
  selectable = false,
}: BookingCalendarProps) {
  return (
    <BookingCalendarProvider
      events={events}
      date={date}
      setDate={setDate}
      mode={mode}
      setMode={setMode}
      onSelectSlot={onSelectSlot}
      onSelectEvent={onSelectEvent}
      selectable={selectable}
    >
      <div className="flex flex-col h-full min-h-0 booking-calendar">
        <CalendarHeader>
          <CalendarHeaderDate />
          <div className="flex flex-wrap items-center gap-2">
            <CalendarHeaderMode />
            <CalendarHeaderAdd />
          </div>
        </CalendarHeader>
        <CalendarBody />
      </div>
    </BookingCalendarProvider>
  );
}

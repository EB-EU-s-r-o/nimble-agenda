import { addMinutes, startOfDay } from "date-fns";
import { isSameDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useBookingCalendarContext } from "../calendar-context";
import { BookingCalendarEvent } from "../BookingCalendarEvent";
import { CalendarBodyHeader } from "./CalendarBodyHeader";
import { HOURS, PIXELS_PER_HOUR } from "../calendar-types";

export function CalendarBodyDayContent({ date }: { date: Date }) {
  const { events, onSelectSlot, selectable } = useBookingCalendarContext();
  const dayEvents = events.filter((e) => isSameDay(e.start, date));

  const getSlotRange = (hour: number) => {
    const start = addMinutes(
      startOfDay(date),
      Math.floor((hour * 60) / 30) * 30
    );
    return { start, end: addMinutes(start, 30) };
  };

  const handleSlotClick = (hour: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectable || !onSelectSlot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const minutesIntoHour = (y / rect.height) * 60;
    const totalMinutes = hour * 60 + minutesIntoHour;
    const start = addMinutes(
      startOfDay(date),
      Math.floor(totalMinutes / 30) * 30
    );
    const end = addMinutes(start, 30);
    onSelectSlot({ start, end });
  };

  const handleSlotKeyDown = (
    hour: number,
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (!selectable || !onSelectSlot) return;
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    const { start, end } = getSlotRange(hour);
    onSelectSlot({ start, end });
  };

  return (
    <div className="flex flex-col flex-grow min-w-0">
      <CalendarBodyHeader date={date} />

      <div className="flex-1 relative min-h-0">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className={cn(
              "h-32 border-b border-border/50 group transition-colors",
              selectable && "cursor-pointer booking-calendar-slot"
            )}
            style={{ height: PIXELS_PER_HOUR }}
            onClick={(e) =>
              selectable && onSelectSlot && handleSlotClick(hour, e)
            }
            onKeyDown={(e) => handleSlotKeyDown(hour, e)}
            role={selectable ? "button" : undefined}
            tabIndex={selectable ? 0 : undefined}
            aria-label={
              selectable ? `Vybrať čas okolo ${hour}:00` : undefined
            }
          />
        ))}

        {dayEvents.map((event) => (
          <BookingCalendarEvent key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}

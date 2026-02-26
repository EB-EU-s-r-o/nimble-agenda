import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  isWithinInterval,
} from "date-fns";
import { sk } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useBookingCalendarContext } from "../calendar-context";
import { BookingCalendarEvent } from "../BookingCalendarEvent";

const WEEKDAY_LABELS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

export function CalendarBodyMonth() {
  const { date, events, setDate, setMode } = useBookingCalendarContext();

  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  const today = new Date();

  const visibleEvents = events.filter(
    (event) =>
      isWithinInterval(event.start, {
        start: calendarStart,
        end: calendarEnd,
      }) ||
      isWithinInterval(event.end, { start: calendarStart, end: calendarEnd })
  );

  return (
    <div className="flex flex-col flex-grow overflow-hidden min-h-0">
      <div className="hidden md:grid grid-cols-7 border-border divide-x divide-border">
        {WEEKDAY_LABELS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-sm font-medium text-muted-foreground border-b border-border"
          >
            {day}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={monthStart.toISOString()}
          className="grid md:grid-cols-7 flex-grow overflow-y-auto relative min-h-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          {calendarDays.map((day) => {
            const dayEvents = visibleEvents.filter((e) =>
              isSameDay(e.start, day)
            );
            const isToday = isSameDay(day, today);
            const isCurrentMonth = isSameMonth(day, date);

            return (
              <button
                type="button"
                key={day.toISOString()}
                className={cn(
                  "relative flex flex-col border-b border-r border-border p-2 aspect-square cursor-pointer min-h-[80px] md:min-h-0 w-full text-left",
                  !isCurrentMonth && "bg-muted/50 hidden md:flex"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setDate(day);
                  setMode("day");
                }}
              >
                <div
                  className={cn(
                    "text-sm font-medium w-fit p-1 flex flex-col items-center justify-center rounded-full aspect-square",
                    isToday && "booking-calendar-today"
                  )}
                >
                  {format(day, "d", { locale: sk })}
                </div>
                <AnimatePresence mode="wait">
                  <div className="flex flex-col gap-1 mt-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <BookingCalendarEvent
                        key={event.id}
                        event={event}
                        className="relative h-auto"
                        month
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <motion.div
                        key={`more-${day.toISOString()}`}
                        role="button"
                        tabIndex={0}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-xs font-medium booking-calendar-more hover:underline cursor-pointer rounded px-1 -mx-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDate(day);
                          setMode("day");
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return;
                          e.preventDefault();
                          setDate(day);
                          setMode("day");
                        }}
                        aria-label={`Prejsť na deň ${format(day, "d. M.", { locale: sk })} (${dayEvents.length - 3} ďalších)`}
                      >
                        +{dayEvents.length - 3} ďalších
                      </motion.div>
                    )}
                  </div>
                </AnimatePresence>
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

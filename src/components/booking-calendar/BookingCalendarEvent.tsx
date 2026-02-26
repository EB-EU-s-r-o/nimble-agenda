import { format, isSameDay, isSameMonth } from "date-fns";
import { sk } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { BookingCalendarEvent as EventType } from "./calendar-types";
import { useBookingCalendarContext } from "./calendar-context";
import { PIXELS_PER_HOUR } from "./calendar-types";
import { getEventColorClasses } from "./event-color-classes";

interface EventPosition {
  left: string;
  width: string;
  top: string;
  height: string;
}

function getOverlappingEvents(
  current: EventType,
  events: EventType[]
): EventType[] {
  return events.filter((e) => {
    if (e.id === current.id) return false;
    return (
      current.start < e.end &&
      current.end > e.start &&
      isSameDay(current.start, e.start)
    );
  });
}

function calculateEventPosition(
  event: EventType,
  allEvents: EventType[]
): EventPosition {
  const overlapping = getOverlappingEvents(event, allEvents);
  const group = [event, ...overlapping].sort(
    (a, b) => a.start.getTime() - b.start.getTime()
  );
  const position = group.indexOf(event);
  const total = overlapping.length + 1;
  const width = `${100 / total}%`;
  const left = `${(position * 100) / total}%`;

  const startHour = event.start.getHours();
  const startMinutes = event.start.getMinutes();
  let endHour = event.end.getHours();
  let endMinutes = event.end.getMinutes();
  if (!isSameDay(event.start, event.end)) {
    endHour = 23;
    endMinutes = 59;
  }

  const topPx =
    startHour * PIXELS_PER_HOUR + (startMinutes / 60) * PIXELS_PER_HOUR;
  const durationMin =
    endHour * 60 + endMinutes - (startHour * 60 + startMinutes);
  const heightPx = (durationMin / 60) * PIXELS_PER_HOUR;

  return {
    left,
    width,
    top: `${topPx}px`,
    height: `${heightPx}px`,
  };
}

export interface BookingCalendarEventProps {
  event: EventType;
  month?: boolean;
  className?: string;
}

export function BookingCalendarEvent({
  event,
  month = false,
  className,
}: BookingCalendarEventProps) {
  const { events, date, onSelectEvent } = useBookingCalendarContext();
  const style = month ? undefined : calculateEventPosition(event, events);
  const isInCurrentMonth = isSameMonth(event.start, date);
  const animationKey = `${event.id}-${isInCurrentMonth ? "current" : "adjacent"}`;
  const colorClasses = getEventColorClasses(event.color);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectEvent?.(event);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    e.stopPropagation();
    onSelectEvent?.(event);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        role="button"
        tabIndex={0}
        className={cn(
          "px-3 py-1.5 rounded-md truncate cursor-pointer transition-all duration-300 border booking-calendar-event",
          colorClasses,
          !month && "absolute",
          className
        )}
        style={style}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        initial={{ opacity: 0, y: -3, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{
          opacity: 0,
          scale: 0.98,
          transition: { duration: 0.15, ease: "easeOut" },
        }}
        transition={{
          duration: 0.2,
          ease: [0.25, 0.1, 0.25, 1],
          opacity: { duration: 0.2, ease: "linear" },
          layout: { duration: 0.2, ease: "easeOut" },
        }}
        layoutId={`event-${animationKey}-${month ? "month" : "day"}`}
      >
        <motion.div
          className={cn(
            "flex flex-col w-full",
            month && "flex-row items-center justify-between"
          )}
          layout="position"
        >
          <p className={cn("font-bold truncate", month && "text-xs")}>
            {event.title}
          </p>
          <p className={cn("text-sm", month && "text-xs")}>
            <span>{format(event.start, "HH:mm", { locale: sk })}</span>
            <span className={cn("mx-1", month && "hidden")}>–</span>
            <span className={cn(month && "hidden")}>
              {format(event.end, "HH:mm", { locale: sk })}
            </span>
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

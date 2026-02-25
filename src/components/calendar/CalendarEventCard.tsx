import type { NormalizedCalendarEvent } from "@/lib/calendarEventUtils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CalendarEventCardProps {
  event: NormalizedCalendarEvent;
}

export function CalendarEventCard({ event }: CalendarEventCardProps) {
  return (
    <TooltipProvider delayDuration={250}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="calendar-event-card" title={`${event.displayTimeRange} • ${event.displayTitle}`}>
            <p className="calendar-event-time">{event.displayTimeRange}</p>
            <p className="calendar-event-title">{event.displayTitle}</p>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-72 text-xs">
          <p className="font-semibold">{event.displayTitle}</p>
          <p>{event.displayTimeRange}</p>
          <p>{event.employeeName}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

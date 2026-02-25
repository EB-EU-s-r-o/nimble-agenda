import { format } from "date-fns";
import type { CalendarEvent, Employee, TimeSegment } from "./types";
import CalendarEventCard from "./CalendarEventCard";
import NonWorkingOverlay from "./NonWorkingOverlay";
import { getMinutesInTZ } from "@/lib/timezone";
import { canBookSlot, isSlotBlockedByEvents } from "./slotGuards";

interface EmployeeColumnProps {
  employee: Employee;
  events: CalendarEvent[];
  segments: TimeSegment[];
  date: Date;
  startHour: number;
  endHour: number;
  hourHeight: number;
  timezone: string;
  onSlotClick: (employeeId: string, time: Date, isWorking: boolean) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export default function EmployeeColumn({
  employee,
  events,
  segments,
  date,
  startHour,
  endHour,
  hourHeight,
  timezone,
  onSlotClick,
  onEventClick,
}: EmployeeColumnProps) {
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);

  return (
    <div className="min-w-[170px] border-l border-border/40">
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-2 py-2 backdrop-blur">
        <p className="truncate text-xs font-semibold" style={{ color: employee.color }}>
          {employee.name}
        </p>
      </div>

      <div className="relative" style={{ height: (endHour - startHour) * hourHeight }}>
        <NonWorkingOverlay hourHeight={hourHeight} startHour={startHour} segments={segments} />

        {hours.map((hour) => {
          const slotTime = new Date(date);
          slotTime.setHours(hour, 0, 0, 0);
          const minute = getMinutesInTZ(slotTime, timezone);
          const slotWorking = segments.some((segment) => segment.kind === "working" && minute >= segment.startMinutes && minute < segment.endMinutes);
          const slotBlocked = isSlotBlockedByEvents(slotTime, events);
          const slotBookable = canBookSlot({ slotWorking, slotBlocked });

          return (
            <button
              key={`${employee.id}-${format(slotTime, "HH")}`}
              onClick={() => onSlotClick(employee.id, slotTime, slotBookable)}
              className="absolute left-0 right-0 border-b border-border/30"
              style={{ top: (hour - startHour) * hourHeight, height: hourHeight }}
              title={slotBookable ? "Vytvoriť rezerváciu" : slotBlocked ? "Čas je blokovaný" : "Zamestnanec v tomto čase nepracuje"}
            />
          );
        })}

        {events.map((event) => (
          <CalendarEventCard
            key={event.id}
            event={event}
            employee={employee}
            hourHeight={hourHeight}
            startHour={startHour}
            timezone={timezone}
            onClick={onEventClick}
          />
        ))}
      </div>
    </div>
  );
}

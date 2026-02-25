import type { CalendarEvent, DayException, Employee, WorkingSchedule } from "./types";
import EmployeeColumn from "./EmployeeColumn";
import { computeDaySegments } from "./schedule";

interface CalendarGridProps {
  date: Date;
  employees: Employee[];
  selectedEmployeeIds: string[];
  events: CalendarEvent[];
  schedules: WorkingSchedule[];
  dayExceptions: DayException[];
  timezone: string;
  onSlotClick: (employeeId: string, time: Date, isWorking: boolean) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 58;

export default function CalendarGrid({
  date,
  employees,
  selectedEmployeeIds,
  events,
  schedules,
  dayExceptions,
  timezone,
  onSlotClick,
  onEventClick,
}: CalendarGridProps) {
  const selectedEmployees = employees.filter((employee) => selectedEmployeeIds.includes(employee.id));

  return (
    <div className="flex-1 min-h-0 overflow-auto border-t border-border/40">
      <div className="flex min-w-max">
        <div className="sticky left-0 z-20 w-12 border-r border-border/40 bg-background">
          <div className="h-[36px] border-b border-border/40" />
          {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i).map((hour) => (
            <div key={hour} className="border-b border-border/30 px-1 pt-1 text-[10px] text-muted-foreground" style={{ height: HOUR_HEIGHT }}>
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {selectedEmployees.map((employee) => {
          const segments = computeDaySegments(date, employee.id, schedules, dayExceptions);
          const employeeEvents = events.filter((event) => event.employeeId === employee.id);

          return (
            <EmployeeColumn
              key={employee.id}
              employee={employee}
              events={employeeEvents}
              segments={segments}
              date={date}
              startHour={START_HOUR}
              endHour={END_HOUR}
              hourHeight={HOUR_HEIGHT}
              timezone={timezone}
              onSlotClick={onSlotClick}
              onEventClick={onEventClick}
            />
          );
        })}
      </div>
    </div>
  );
}

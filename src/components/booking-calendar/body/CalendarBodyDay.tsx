import { useBookingCalendarContext } from "../calendar-context";
import { CalendarBodyMargin } from "./CalendarBodyMargin";
import { CalendarBodyDayContent } from "./CalendarBodyDayContent";

export function CalendarBodyDay() {
  const { date } = useBookingCalendarContext();

  return (
    <div className="flex divide-x divide-border flex-grow overflow-hidden min-h-0">
      <div className="flex flex-col flex-grow divide-y divide-border overflow-hidden min-h-0">
        <div className="flex flex-col flex-1 overflow-y-auto min-h-0">
          <div className="relative flex flex-1 divide-x divide-border min-h-0">
            <CalendarBodyMargin />
            <CalendarBodyDayContent date={date} />
          </div>
        </div>
      </div>
    </div>
  );
}

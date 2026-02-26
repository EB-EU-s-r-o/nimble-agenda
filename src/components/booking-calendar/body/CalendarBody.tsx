import { useBookingCalendarContext } from "../calendar-context";
import { CalendarBodyDay } from "./CalendarBodyDay";
import { CalendarBodyWeek } from "./CalendarBodyWeek";
import { CalendarBodyMonth } from "./CalendarBodyMonth";

export function CalendarBody() {
  const { mode } = useBookingCalendarContext();

  return (
    <div className="flex flex-col flex-1 min-h-0 booking-calendar-body">
      {mode === "day" && <CalendarBodyDay />}
      {mode === "week" && <CalendarBodyWeek />}
      {mode === "month" && <CalendarBodyMonth />}
    </div>
  );
}

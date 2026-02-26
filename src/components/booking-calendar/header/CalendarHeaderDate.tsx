import { format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from "date-fns";
import { sk } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useBookingCalendarContext } from "../calendar-context";

export function CalendarHeaderDate() {
  const { mode, date, setDate } = useBookingCalendarContext();

  const handleBack = () => {
    if (mode === "month") setDate(subMonths(date, 1));
    else if (mode === "week") setDate(subWeeks(date, 1));
    else setDate(subDays(date, 1));
  };

  const handleForward = () => {
    if (mode === "month") setDate(addMonths(date, 1));
    else if (mode === "week") setDate(addWeeks(date, 1));
    else setDate(addDays(date, 1));
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" className="h-8 w-8 hover:bg-gold/10 hover:border-gold/50 hover:text-gold" onClick={handleBack}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="min-w-[180px] text-center text-sm font-medium text-foreground">
        {format(date, "d. MMMM yyyy", { locale: sk })}
      </span>
      <Button variant="outline" size="icon" className="h-8 w-8 hover:bg-gold/10 hover:border-gold/50 hover:text-gold" onClick={handleForward}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

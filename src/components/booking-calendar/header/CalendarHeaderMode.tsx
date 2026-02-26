import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useBookingCalendarContext } from "../calendar-context";
import { CALENDAR_MODES, type BookingCalendarMode } from "../calendar-types";
import { CalendarDays, CalendarRange, Calendar } from "lucide-react";

const MODE_LABELS: Record<BookingCalendarMode, string> = {
  day: "Deň",
  week: "Týždeň",
  month: "Mesiac",
};

const MODE_ICONS: Record<BookingCalendarMode, React.ReactNode> = {
  day: <Calendar className="h-4 w-4" />,
  week: <CalendarRange className="h-4 w-4" />,
  month: <CalendarDays className="h-4 w-4" />,
};

export function CalendarHeaderMode() {
  const { mode, setMode } = useBookingCalendarContext();

  return (
    <ToggleGroup
      type="single"
      value={mode}
      onValueChange={(v) => v && setMode(v as BookingCalendarMode)}
      className="rounded-lg border border-border overflow-hidden bg-muted/30"
    >
      {CALENDAR_MODES.map((m) => (
        <ToggleGroupItem
          key={m}
          value={m}
          className="rounded-none border-0 data-[state=on]:bg-gold data-[state=on]:text-gold-foreground data-[state=on]:font-medium"
        >
          <span className="flex items-center gap-1.5">
            {MODE_ICONS[m]}
            {MODE_LABELS[m]}
          </span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

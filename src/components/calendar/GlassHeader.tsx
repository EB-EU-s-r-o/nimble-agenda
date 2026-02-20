import { format, startOfWeek, endOfWeek } from "date-fns";
import { sk } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CalendarViewSwitcher, { type CalendarView } from "./CalendarViewSwitcher";

interface GlassHeaderProps {
  currentDate: Date;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

export default function GlassHeader({
  currentDate,
  view,
  onViewChange,
  onPrev,
  onNext,
  onToday,
}: GlassHeaderProps) {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const currentStr = format(currentDate, "yyyy-MM-dd");
  const isToday = currentStr === todayStr;

  // Dynamic title based on view
  let title: string;
  let subtitle: string;

  if (view === "month") {
    title = format(currentDate, "LLLL yyyy", { locale: sk });
    subtitle = "";
  } else if (view === "week") {
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    const we = endOfWeek(currentDate, { weekStartsOn: 1 });
    title = `${format(ws, "d.")} – ${format(we, "d. MMM", { locale: sk })}`;
    subtitle = format(currentDate, "yyyy");
  } else {
    const dayName = format(currentDate, "EEEE", { locale: sk });
    title = isToday ? "Dnes" : dayName;
    subtitle = format(currentDate, "d. MMMM yyyy", { locale: sk });
  }

  return (
    <header className="cal-header sticky top-0 z-30 backdrop-blur-xl border-b border-border/30 bg-background/60">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground capitalize tracking-tight leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {!isToday && (
            <button
              onClick={onToday}
              className="cal-header__btn px-3 py-1.5 text-xs font-medium text-gold rounded-full border border-gold/30 bg-gold/10 hover:bg-gold/20 transition-colors mr-2"
            >
              Dnes
            </button>
          )}
          <button
            onClick={onPrev}
            className="cal-header__btn p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={onNext}
            className="cal-header__btn p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* View switcher */}
      <div className="flex justify-center px-4 pb-3">
        <CalendarViewSwitcher view={view} onViewChange={onViewChange} />
      </div>
    </header>
  );
}

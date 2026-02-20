import { format } from "date-fns";
import { sk } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface GlassHeaderProps {
  currentDate: Date;
  onPrevDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
}

export default function GlassHeader({
  currentDate,
  onPrevDay,
  onNextDay,
  onToday,
}: GlassHeaderProps) {
  const isToday =
    format(currentDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  const dayName = format(currentDate, "EEEE", { locale: sk });
  const dateLabel = format(currentDate, "d. MMMM yyyy", { locale: sk });

  return (
    <header className="cal-header sticky top-0 z-30 backdrop-blur-xl border-b border-border/30 bg-background/60">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-foreground capitalize tracking-tight leading-tight">
            {isToday ? "Dnes" : dayName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{dateLabel}</p>
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
            onClick={onPrevDay}
            className="cal-header__btn p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={onNextDay}
            className="cal-header__btn p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

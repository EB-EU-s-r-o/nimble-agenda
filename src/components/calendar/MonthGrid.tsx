import { useMemo } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { sk } from "date-fns/locale";
import type { CalendarAppointment } from "./AppointmentBlock";

interface MonthGridProps {
  currentDate: Date;
  appointments: CalendarAppointment[];
  onDayClick: (date: Date) => void;
}

const DAY_NAMES = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

export default function MonthGrid({ currentDate, appointments, onDayClick }: MonthGridProps) {
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentDate]);

  // Count appointments per day
  const aptCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const apt of appointments) {
      const key = format(new Date(apt.start_at), "yyyy-MM-dd");
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [appointments]);

  return (
    <div className="flex flex-col h-full px-3 py-2">
      {/* Day name headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells — flex-1 stretches to fill remaining height */}
      <div className="grid grid-cols-7 gap-px flex-1 auto-rows-fr">
        {days.map((day) => {
          const inMonth = isSameMonth(day, currentDate);
          const today = isToday(day);
          const key = format(day, "yyyy-MM-dd");
          const count = aptCountMap.get(key) ?? 0;

          return (
            <button
              key={key}
              onClick={() => onDayClick(day)}
              className={`relative flex flex-col items-center justify-center min-h-0 rounded-xl transition-colors ${
                !inMonth
                  ? "text-muted-foreground/25"
                  : today
                  ? "text-gold-foreground"
                  : "text-foreground hover:bg-accent/50"
              } ${count > 0 && inMonth ? "bg-gold/5" : ""}`}
            >
              {/* Today gold ring */}
              {today && (
                <div className="absolute inset-1 rounded-xl border-2 border-gold/60 bg-gold/15" />
              )}
              <span className={`relative z-10 text-base font-medium ${today ? "font-bold" : ""}`}>
                {format(day, "d")}
              </span>
              {/* Dot indicators */}
              {count > 0 && inMonth && (
                <div className="relative z-10 flex gap-1 mt-1">
                  {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 rounded-full bg-gold" />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

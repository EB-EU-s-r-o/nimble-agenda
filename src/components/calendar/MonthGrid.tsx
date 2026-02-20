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
  getDay,
} from "date-fns";
import type { CalendarAppointment } from "./AppointmentBlock";

interface BusinessHour {
  day_of_week: string;
  mode: string;
  start_time: string;
  end_time: string;
}

interface Schedule {
  employee_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
}

interface MonthGridProps {
  currentDate: Date;
  appointments: CalendarAppointment[];
  onDayClick: (date: Date) => void;
  businessHours?: BusinessHour[];
  schedules?: Schedule[];
}

const DAY_NAMES = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

const DOW_MAP: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

function parseTimeMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export default function MonthGrid({
  currentDate,
  appointments,
  onDayClick,
  businessHours = [],
  schedules = [],
}: MonthGridProps) {
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

  // Calculate free slots per day: null = closed, number = free slots
  const freeSlotsMap = useMemo(() => {
    const map = new Map<string, number | null>();
    if (!businessHours.length) return map;

    for (const day of days) {
      const key = format(day, "yyyy-MM-dd");
      const dow = DOW_MAP[getDay(day)];
      const bh = businessHours.find((h) => h.day_of_week === dow);

      if (!bh || bh.mode === "closed") {
        map.set(key, null);
        continue;
      }

      // Sum employee working minutes for this day
      const daySchedules = schedules.filter((s) => s.day_of_week === dow);
      let totalMinutes = 0;
      for (const s of daySchedules) {
        totalMinutes += parseTimeMinutes(s.end_time) - parseTimeMinutes(s.start_time);
      }

      // If no employee schedules, use business hours as fallback
      if (daySchedules.length === 0) {
        totalMinutes = parseTimeMinutes(bh.end_time) - parseTimeMinutes(bh.start_time);
      }

      const totalSlots = Math.floor(totalMinutes / 30);
      const booked = aptCountMap.get(key) ?? 0;
      map.set(key, Math.max(0, totalSlots - booked));
    }

    return map;
  }, [days, businessHours, schedules, aptCountMap]);

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
          const freeSlots = freeSlotsMap.get(key);
          const isClosed = freeSlots === null;

          return (
            <button
              key={key}
              onClick={() => onDayClick(day)}
              className={`relative flex flex-col items-center justify-center min-h-0 rounded-xl transition-colors ${
                !inMonth
                  ? "text-muted-foreground/25"
                  : isClosed
                  ? "text-muted-foreground/40"
                  : today
                  ? "text-gold-foreground"
                  : "text-foreground hover:bg-accent/50"
              } ${count > 0 && inMonth && !isClosed ? "bg-gold/5" : ""}`}
            >
              {/* Today gold ring */}
              {today && (
                <div className="absolute inset-1 rounded-xl border-2 border-gold/60 bg-gold/15" />
              )}
              <span className={`relative z-10 text-base font-medium ${today ? "font-bold" : ""}`}>
                {format(day, "d")}
              </span>

              {/* Free slots indicator */}
              {inMonth && businessHours.length > 0 && (
                <span className={`relative z-10 text-[9px] leading-tight mt-0.5 font-medium ${
                  isClosed
                    ? "text-muted-foreground/30"
                    : freeSlots === 0
                    ? "text-destructive/70"
                    : "text-emerald-500/80"
                }`}>
                  {isClosed ? "—" : freeSlots === 0 ? "plný" : `${freeSlots}`}
                </span>
              )}

              {/* Dot indicators */}
              {count > 0 && inMonth && !isClosed && (
                <div className="relative z-10 flex gap-1 mt-0.5">
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

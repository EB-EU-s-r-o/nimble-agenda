import { useMemo } from "react";
import { startOfWeek, addDays, format, isSameDay, isToday } from "date-fns";
import { sk } from "date-fns/locale";
import { formatTimeInTZ } from "@/lib/timezone";
import type { CalendarAppointment } from "./AppointmentBlock";

interface WeekTimelineProps {
  readonly currentDate: Date;
  readonly appointments: CalendarAppointment[];
  readonly timezone: string;
  readonly onDayClick: (date: Date) => void;
  readonly onTapAppointment: (apt: CalendarAppointment) => void;
}

const STATUS_DOT: Record<string, string> = {
  pending: "bg-gold",
  confirmed: "bg-emerald-500",
  cancelled: "bg-red-500",
  completed: "bg-muted-foreground/50",
};

export default function WeekTimeline({
  currentDate,
  appointments,
  timezone,
  onDayClick,
  onTapAppointment,
}: WeekTimelineProps) {
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  // Group appointments by day
  const aptsByDay = useMemo(() => {
    const map = new Map<string, CalendarAppointment[]>();
    for (const apt of appointments) {
      const key = format(new Date(apt.start_at), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(apt);
      map.set(key, list);
    }
    return map;
  }, [appointments]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="divide-y divide-border/30">
        {weekDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayApts = aptsByDay.get(key) ?? [];
          const today = isToday(day);
          const isSelected = isSameDay(day, currentDate);

          return (
            <div key={key} className={`${today ? "bg-gold/5" : ""}`}>
              {/* Day header */}
              <button
                onClick={() => onDayClick(day)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors"
              >
                <div className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold ${
                  today
                    ? "bg-gold text-gold-foreground"
                    : (isSelected
                      ? "bg-accent text-foreground"
                      : "text-foreground")
                }`}>
                  {format(day, "d")}
                </div>
                <div className="flex flex-col items-start">
                  <span className={`text-xs font-semibold capitalize ${today ? "text-gold" : "text-foreground"}`}>
                    {format(day, "EEEE", { locale: sk })}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(day, "d. MMM", { locale: sk })}
                  </span>
                </div>
                {dayApts.length > 0 && (
                  <span className="ml-auto text-[10px] font-semibold text-gold bg-gold/10 px-2 py-0.5 rounded-full border border-gold/20">
                    {dayApts.length}
                  </span>
                )}
              </button>

              {/* Appointment list */}
              {dayApts.length > 0 && (
                <div className="pb-2 px-4 pl-16 space-y-1">
                  {dayApts.map((apt) => (
                    <button
                      key={apt.id}
                      onClick={() => onTapAppointment(apt)}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-card/60 border border-border/30 hover:bg-accent/30 transition-colors text-left"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[apt.status] ?? STATUS_DOT.pending}`} />
                      <span className="text-xs font-medium text-foreground truncate">
                        {apt.service_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                        {formatTimeInTZ(new Date(apt.start_at), timezone)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

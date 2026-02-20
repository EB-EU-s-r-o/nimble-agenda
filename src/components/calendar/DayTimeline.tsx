import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import AppointmentBlock, { type CalendarAppointment } from "./AppointmentBlock";

const START_HOUR = 8;
const END_HOUR = 20;
const HOUR_HEIGHT = 64; // px per hour
const SNAP_MINUTES = 15;

interface DayTimelineProps {
  date: Date;
  appointments: CalendarAppointment[];
  onTapSlot: (time: Date) => void;
  onTapAppointment: (apt: CalendarAppointment) => void;
}

export default function DayTimeline({
  date,
  appointments,
  onTapSlot,
  onTapAppointment,
}: DayTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i),
    []
  );
  const totalHeight = hours.length * HOUR_HEIGHT;

  // Live clock state — updates every 60s
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // Scroll to current time on mount / date change
  const scrollToNow = useCallback(() => {
    const minutesSinceStart = (now.getHours() - START_HOUR) * 60 + now.getMinutes();
    if (minutesSinceStart > 0 && scrollRef.current) {
      const offset = (minutesSinceStart / 60) * HOUR_HEIGHT - 120;
      scrollRef.current.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
    }
  }, [now]);

  useEffect(() => {
    scrollToNow();
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  // Current time indicator position
  const isToday = date.toDateString() === now.toDateString();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = ((nowMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
  const showNowLine = isToday && nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60;

  const handleGridTap = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't trigger if they tapped an appointment
    if ((e.target as HTMLElement).closest(".cal-apt")) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top + (scrollRef.current?.scrollTop ?? 0);
    const rawMinutes = START_HOUR * 60 + (y / HOUR_HEIGHT) * 60;
    const snapped = Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;
    const hours = Math.floor(snapped / 60);
    const mins = snapped % 60;

    const slotTime = new Date(date);
    slotTime.setHours(hours, mins, 0, 0);

    if (hours >= START_HOUR && hours < END_HOUR) {
      onTapSlot(slotTime);
    }
  };

  return (
    <div
      ref={scrollRef}
      className="cal-timeline flex-1 overflow-y-auto overscroll-contain"
    >
      <div
        className="relative"
        style={{ height: totalHeight }}
        onClick={handleGridTap}
      >
        {/* Hour grid lines + labels */}
        {hours.map((hour) => {
          const top = (hour - START_HOUR) * HOUR_HEIGHT;
          return (
            <div key={hour} className="absolute left-0 right-0" style={{ top }}>
              <div className="flex items-start">
                <span className="cal-timeline__label w-12 text-right pr-2 text-[11px] text-white/30 font-medium -mt-[7px] select-none">
                  {String(hour).padStart(2, "0")}:00
                </span>
                <div className="flex-1 border-t border-white/8" />
              </div>
            </div>
          );
        })}

        {/* Half-hour lines */}
        {hours.map((hour) => {
          const top = (hour - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2;
          return (
            <div
              key={`${hour}-half`}
              className="absolute left-12 right-0 border-t border-white/4"
              style={{ top }}
            />
          );
        })}

        {/* Current time indicator */}
        {showNowLine && (
          <div
            className="absolute left-10 right-0 z-20 flex items-center pointer-events-none"
            style={{ top: nowTop }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shadow-lg shadow-red-500/40" />
            <div className="flex-1 h-[2px] bg-red-500 shadow-sm shadow-red-500/30" />
          </div>
        )}

        {/* Appointment blocks */}
        {appointments.map((apt) => (
          <AppointmentBlock
            key={apt.id}
            appointment={apt}
            hourHeight={HOUR_HEIGHT}
            startHour={START_HOUR}
            onClick={onTapAppointment}
          />
        ))}
      </div>
    </div>
  );
}

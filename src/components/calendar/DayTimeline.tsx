import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import AppointmentBlock, { type CalendarAppointment } from "./AppointmentBlock";

const START_HOUR = 8;
const END_HOUR = 20;
const HOUR_HEIGHT = 64; // px per hour
const SNAP_MINUTES = 15;
const LONG_PRESS_MS = 500;
const MOVE_CANCEL_PX = 10;

interface DayTimelineProps {
  date: Date;
  appointments: CalendarAppointment[];
  onTapSlot: (time: Date) => void;
  onTapAppointment: (apt: CalendarAppointment) => void;
  onMoveAppointment?: (id: string, newStart: Date) => void;
}

export default function DayTimeline({
  date,
  appointments,
  onTapSlot,
  onTapAppointment,
  onMoveAppointment,
}: DayTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
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

  // ─── Drag-to-move state ───────────────────────────────────────────
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragTop, setDragTop] = useState(0);
  const [dragLabel, setDragLabel] = useState("");
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerStartY = useRef(0);
  const pointerStartX = useRef(0);
  const dragActive = useRef(false);
  const dragOffsetY = useRef(0);
  const dragAptDuration = useRef(0);
  const justDragged = useRef(false);

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const yToSnappedMinutes = (clientY: number) => {
    if (!gridRef.current || !scrollRef.current) return START_HOUR * 60;
    const rect = gridRef.current.getBoundingClientRect();
    const y = clientY - rect.top + scrollRef.current.scrollTop - dragOffsetY.current;
    const rawMinutes = START_HOUR * 60 + (y / HOUR_HEIGHT) * 60;
    return Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;
  };

  const minutesToTop = (mins: number) =>
    ((mins - START_HOUR * 60) / 60) * HOUR_HEIGHT;

  const formatMinutes = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    const aptEl = (e.target as HTMLElement).closest<HTMLElement>(".cal-apt");
    if (!aptEl || !onMoveAppointment) return;

    const aptId = aptEl.dataset.aptId;
    if (!aptId) return;

    const apt = appointments.find((a) => a.id === aptId);
    if (!apt) return;

    pointerStartX.current = e.clientX;
    pointerStartY.current = e.clientY;

    longPressTimer.current = setTimeout(() => {
      // Activate drag
      dragActive.current = true;
      justDragged.current = true;

      const start = new Date(apt.start_at);
      const end = new Date(apt.end_at);
      dragAptDuration.current =
        (end.getTime() - start.getTime()) / 60_000;

      // Calculate offset within the block where they pressed
      const aptRect = aptEl.getBoundingClientRect();
      dragOffsetY.current = e.clientY - aptRect.top;

      const startMins = start.getHours() * 60 + start.getMinutes();
      setDragId(aptId);
      setDragTop(minutesToTop(startMins));
      setDragLabel(formatMinutes(startMins));

      // Capture pointer
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // Cancel long-press if moved too much before activation
    if (!dragActive.current && longPressTimer.current) {
      const dx = Math.abs(e.clientX - pointerStartX.current);
      const dy = Math.abs(e.clientY - pointerStartY.current);
      if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
        clearLongPress();
      }
      return;
    }

    if (!dragActive.current || !dragId) return;

    e.preventDefault();
    const snappedMins = yToSnappedMinutes(e.clientY);
    const maxStart = END_HOUR * 60 - dragAptDuration.current;
    const clampedMins = Math.max(START_HOUR * 60, Math.min(maxStart, snappedMins));

    setDragTop(minutesToTop(clampedMins));
    setDragLabel(formatMinutes(clampedMins));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    clearLongPress();

    if (dragActive.current && dragId && onMoveAppointment) {
      const snappedMins = yToSnappedMinutes(e.clientY);
      const maxStart = END_HOUR * 60 - dragAptDuration.current;
      const clampedMins = Math.max(START_HOUR * 60, Math.min(maxStart, snappedMins));

      const newStart = new Date(date);
      newStart.setHours(Math.floor(clampedMins / 60), clampedMins % 60, 0, 0);

      onMoveAppointment(dragId, newStart);

      // Reset after a tick so click doesn't fire
      setTimeout(() => {
        justDragged.current = false;
      }, 100);
    } else {
      justDragged.current = false;
    }

    dragActive.current = false;
    setDragId(null);
    setDragLabel("");
  };

  const handleGridTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (justDragged.current) return;
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
      style={{ touchAction: dragId ? "none" : undefined }}
    >
      <div
        ref={gridRef}
        className="relative"
        style={{ height: totalHeight }}
        onClick={handleGridTap}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          clearLongPress();
          dragActive.current = false;
          setDragId(null);
          justDragged.current = false;
        }}
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

        {/* Drag time label */}
        {dragId && dragLabel && (
          <div
            className="absolute left-1 z-50 pointer-events-none select-none"
            style={{ top: dragTop - 18 }}
          >
            <span className="text-[11px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded-md border border-gold/30">
              {dragLabel}
            </span>
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
            isDragging={dragId === apt.id}
            dragTop={dragId === apt.id ? dragTop : undefined}
          />
        ))}
      </div>
    </div>
  );
}

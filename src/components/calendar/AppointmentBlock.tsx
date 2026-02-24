import { getMinutesInTZ, formatTimeInTZ } from "@/lib/timezone";

export interface CalendarAppointment {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  service_name: string;
  employee_name: string;
  customer_name: string;
  notes?: string | null;
}

interface AppointmentBlockProps {
  readonly appointment: CalendarAppointment;
  readonly hourHeight: number;
  readonly startHour: number;
  readonly timezone: string;
  readonly onClick: (apt: CalendarAppointment) => void;
  readonly isDragging?: boolean;
  readonly dragTop?: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gold/20 border-gold/40 text-gold",
  confirmed: "bg-emerald-500/20 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-red-500/20 border-red-500/40 text-red-700 dark:text-red-300",
  completed: "bg-muted/50 border-border text-muted-foreground",
};

export default function AppointmentBlock({
  appointment,
  hourHeight,
  startHour,
  timezone,
  onClick,
  isDragging = false,
  dragTop,
}: AppointmentBlockProps) {
  const start = new Date(appointment.start_at);
  const end = new Date(appointment.end_at);
  const startMinutes = getMinutesInTZ(start, timezone);
  const endMinutes = getMinutesInTZ(end, timezone);
  const durationMinutes = endMinutes - startMinutes;

  const calculatedTop = ((startMinutes - startHour * 60) / 60) * hourHeight;
  const top = isDragging && dragTop != null ? dragTop : calculatedTop;
  const height = Math.max((durationMinutes / 60) * hourHeight, 28);

  const colorClass = STATUS_COLORS[appointment.status] || STATUS_COLORS.pending;

  return (
    <button
      data-apt-id={appointment.id}
      onClick={() => {
        if (!isDragging) onClick(appointment);
      }}
      className={`cal-apt absolute left-[52px] right-2 rounded-lg border backdrop-blur-md px-3 py-1.5 text-left transition-transform ${colorClass} ${
        isDragging
          ? "scale-[1.04] z-50 shadow-lg shadow-gold/20 ring-1 ring-gold/30"
          : "active:scale-[0.98]"
      } cal-apt-positioned`}
      style={{ top, height }}
    >
      <p className="text-xs font-semibold truncate leading-tight">
        {appointment.service_name}
      </p>
      {durationMinutes >= 30 && (
        <p className="text-[10px] opacity-70 truncate mt-0.5">
          {appointment.customer_name} · {formatTimeInTZ(start, timezone)}–{formatTimeInTZ(end, timezone)}
        </p>
      )}
    </button>
  );
}

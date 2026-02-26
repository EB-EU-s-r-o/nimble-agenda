import { parseISO } from "date-fns";
import { getMinutesInTZ, formatTimeInTZ } from "@/lib/timezone";

export interface CalendarAppointment {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  service_name: string;
  employee_name: string;
  customer_name: string;
  employee_id?: string;
  type?: "reservation" | "blocked";
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
  /** Overlap handling */
  readonly overlapIndex?: number;
  readonly overlapCount?: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gold/30 border-gold/50 text-gold-dark",
  confirmed: "bg-emerald-500/25 border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-red-500/25 border-red-500/40 text-red-700 dark:text-red-300",
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
  overlapIndex = 0,
  overlapCount = 1,
}: AppointmentBlockProps) {
  // FIX: Proper timezone handling - parse as UTC first
  const startUtc = parseISO(appointment.start_at);
  const endUtc = parseISO(appointment.end_at);
  
  const startMinutes = getMinutesInTZ(startUtc, timezone);
  const endMinutes = getMinutesInTZ(endUtc, timezone);
  const durationMinutes = endMinutes - startMinutes;

  const calculatedTop = ((startMinutes - startHour * 60) / 60) * hourHeight;
  const top = isDragging && dragTop != null ? dragTop : calculatedTop;
  const height = Math.max((durationMinutes / 60) * hourHeight, 28);

  const colorClass = STATUS_COLORS[appointment.status] || STATUS_COLORS.pending;

  // Overlap handling: calculate width and left position
  const widthPercent = overlapCount > 1 ? (100 / overlapCount) : 100;
  
  // For single events, use default positioning; for overlapping, adjust
  const leftOffset = overlapCount > 1 ? 52 + (overlapIndex * 4) : 52;
  const rightOffset = overlapCount > 1 ? 2 + ((overlapCount - 1 - overlapIndex) * 4) : 2;

  return (
    <button
      data-apt-id={appointment.id}
      onClick={() => {
        if (!isDragging) onClick(appointment);
      }}
      className={`cal-apt absolute rounded-lg border backdrop-blur-md px-2 py-1 text-left transition-transform ${colorClass} ${
        isDragging
          ? "scale-[1.04] z-50 shadow-lg shadow-gold/20 ring-1 ring-gold/30"
          : "hover:shadow-md hover:shadow-black/5"
      } cal-apt-dynamic`}
      style={{ 
        top, 
        height, 
        minHeight: 28,
      }}
      title={`${appointment.customer_name} - ${appointment.service_name}`}
    >
      <p className="text-xs font-semibold truncate leading-tight">
        {appointment.service_name}
      </p>
      {durationMinutes >= 25 && (
        <p className="text-[10px] opacity-75 truncate mt-0.5">
          {appointment.customer_name}
        </p>
      )}
      {durationMinutes >= 40 && (
        <p className="text-[10px] opacity-60 truncate">
          {formatTimeInTZ(startUtc, timezone)}–{formatTimeInTZ(endUtc, timezone)}
        </p>
      )}
    </button>
  );
}

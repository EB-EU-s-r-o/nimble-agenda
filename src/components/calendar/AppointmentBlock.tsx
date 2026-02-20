import { format } from "date-fns";

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
  appointment: CalendarAppointment;
  hourHeight: number;
  startHour: number;
  onClick: (apt: CalendarAppointment) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-gold/20 border-gold/40 text-gold",
  confirmed: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
  cancelled: "bg-red-500/20 border-red-500/40 text-red-300",
  completed: "bg-white/10 border-white/20 text-white/50",
};

export default function AppointmentBlock({
  appointment,
  hourHeight,
  startHour,
  onClick,
}: AppointmentBlockProps) {
  const start = new Date(appointment.start_at);
  const end = new Date(appointment.end_at);
  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const endMinutes = end.getHours() * 60 + end.getMinutes();
  const durationMinutes = endMinutes - startMinutes;

  const top = ((startMinutes - startHour * 60) / 60) * hourHeight;
  const height = Math.max((durationMinutes / 60) * hourHeight, 28);

  const colorClass = STATUS_COLORS[appointment.status] || STATUS_COLORS.pending;

  return (
    <button
      onClick={() => onClick(appointment)}
      className={`cal-apt absolute left-[52px] right-2 rounded-lg border backdrop-blur-md px-3 py-1.5 text-left transition-transform active:scale-[0.98] ${colorClass}`}
      style={{ top, height, minHeight: 28 }}
    >
      <p className="text-xs font-semibold truncate leading-tight">
        {appointment.service_name}
      </p>
      {durationMinutes >= 30 && (
        <p className="text-[10px] opacity-70 truncate mt-0.5">
          {appointment.customer_name} · {format(start, "HH:mm")}–{format(end, "HH:mm")}
        </p>
      )}
    </button>
  );
}

import type { CalendarEvent, Employee } from "./types";
import { formatTimeInTZ, getMinutesInTZ } from "@/lib/timezone";
import { Lock } from "lucide-react";

interface CalendarEventCardProps {
  event: CalendarEvent;
  employee?: Employee;
  hourHeight: number;
  startHour: number;
  timezone: string;
  onClick: (event: CalendarEvent) => void;
}

export default function CalendarEventCard({ event, employee, hourHeight, startHour, timezone, onClick }: CalendarEventCardProps) {
  const start = new Date(event.start);
  const end = new Date(event.end);
  const startMinutes = getMinutesInTZ(start, timezone);
  const endMinutes = getMinutesInTZ(end, timezone);
  const top = ((startMinutes - startHour * 60) / 60) * hourHeight;
  const height = Math.max(((endMinutes - startMinutes) / 60) * hourHeight, 34);
  const accent = employee?.color ?? "#64748b";
  const blocked = event.type === "blocked";

  return (
    <button
      onClick={() => onClick(event)}
      className={`absolute left-1 right-1 rounded-lg border px-2 py-1 text-left ${blocked ? "cal-event--blocked" : "cal-event--reservation"}`}
      style={{ top, height, borderColor: accent }}
    >
      <p className="truncate text-[11px] font-semibold leading-tight" style={{ color: accent }}>
        {blocked && <Lock className="mr-1 inline h-3 w-3" />}
        {event.serviceName || event.title}
      </p>
      <p className="truncate text-[10px] text-muted-foreground">
        {formatTimeInTZ(start, timezone)} – {formatTimeInTZ(end, timezone)}
      </p>
      {!blocked && event.clientName && <p className="truncate text-[10px] text-foreground/85">{event.clientName}</p>}
    </button>
  );
}

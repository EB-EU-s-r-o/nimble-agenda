import { DateTime } from "luxon";

export const DEFAULT_BUSINESS_TIMEZONE = "Europe/Bratislava";

const HAS_EXPLICIT_OFFSET = /(Z|[+-]\d{2}:\d{2})$/i;

export interface RawAppointmentEvent {
  id: string;
  start_at: string;
  end_at: string;
  status: string;
  customers?: { full_name?: string | null; phone?: string | null } | null;
  services?: { name_sk?: string | null } | null;
  employees?: { display_name?: string | null } | null;
}

export interface NormalizedCalendarEvent {
  id: string;
  start: Date;
  end: Date;
  startUtc: string;
  endUtc: string;
  status: string;
  timezone: string;
  clientName: string;
  serviceName: string;
  employeeName: string;
  displayTitle: string;
  displayTimeRange: string;
  resource: RawAppointmentEvent;
}

export function parseApiDateToUtc(input: string, timezone = DEFAULT_BUSINESS_TIMEZONE): DateTime {
  if (!input) {
    throw new Error("Missing datetime input");
  }

  const parsed = HAS_EXPLICIT_OFFSET.test(input)
    ? DateTime.fromISO(input, { setZone: true })
    : DateTime.fromISO(input, { zone: timezone });

  if (!parsed.isValid) {
    throw new Error(`Invalid ISO datetime: ${input}`);
  }

  return parsed.toUTC();
}

export function formatTimeRangeFromUtc(
  startUtcIso: string,
  endUtcIso: string,
  timezone = DEFAULT_BUSINESS_TIMEZONE,
): string {
  const start = parseApiDateToUtc(startUtcIso, timezone).setZone(timezone);
  const end = parseApiDateToUtc(endUtcIso, timezone).setZone(timezone);
  return `${start.toFormat("H:mm")} - ${end.toFormat("H:mm")}`;
}

export function normalizeAppointmentEvent(
  raw: RawAppointmentEvent,
  timezone = DEFAULT_BUSINESS_TIMEZONE,
): NormalizedCalendarEvent {
  const startUtc = parseApiDateToUtc(raw.start_at, timezone);
  const endUtc = parseApiDateToUtc(raw.end_at, timezone);

  const clientName = raw.customers?.full_name?.trim() || "Neznámy klient";
  const serviceName = raw.services?.name_sk?.trim() || "Bez názvu služby";
  const employeeName = raw.employees?.display_name?.trim() || "Nepriradený zamestnanec";

  const displayTimeRange = `${startUtc.setZone(timezone).toFormat("H:mm")} - ${endUtc
    .setZone(timezone)
    .toFormat("H:mm")}`;

  return {
    id: raw.id,
    start: startUtc.toJSDate(),
    end: endUtc.toJSDate(),
    startUtc: startUtc.toISO() ?? raw.start_at,
    endUtc: endUtc.toISO() ?? raw.end_at,
    status: raw.status,
    timezone,
    clientName,
    serviceName,
    employeeName,
    displayTitle: `${clientName} • ${serviceName}`,
    displayTimeRange,
    resource: raw,
  };
}

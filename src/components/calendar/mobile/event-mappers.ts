import type { Tables } from "@/integrations/supabase/types";
import type { CalendarAppointment } from "../AppointmentBlock";
import type { DayException } from "./types";
import { getBlockedReason, isBlockedAppointmentNote } from "./blocking";

type AppointmentJoinRow = Tables<"appointments"> & {
  services: { name_sk: string | null } | null;
  employees: { display_name: string | null } | null;
  customers: { full_name: string | null } | null;
};

export function mapAppointmentRowToCalendarAppointment(row: AppointmentJoinRow): CalendarAppointment {
  const blocked = isBlockedAppointmentNote(row.notes);
  const title = blocked ? getBlockedReason(row.notes) : row.services?.name_sk ?? "–";

  return {
    id: row.id,
    start_at: row.start_at,
    end_at: row.end_at,
    status: row.status,
    service_name: title,
    employee_name: row.employees?.display_name ?? "–",
    customer_name: blocked ? "Interné" : row.customers?.full_name ?? "–",
    employee_id: row.employee_id,
    type: blocked ? "blocked" : "reservation",
    notes: row.notes,
  };
}

export function buildDayExceptionsFromBusinessOverrides(
  overrides: Tables<"business_date_overrides">[],
  employeeIds: string[],
): DayException[] {
  const exceptions: DayException[] = [];

  for (const override of overrides) {
    for (const employeeId of employeeIds) {
      if (override.mode === "closed") {
        exceptions.push({
          employeeId,
          date: override.override_date,
          type: "off",
        });
        continue;
      }

      if (override.mode === "open" && override.start_time && override.end_time) {
        exceptions.push({
          employeeId,
          date: override.override_date,
          type: "customHours",
          start: override.start_time,
          end: override.end_time,
          breaks: [],
        });
      }
    }
  }

  return exceptions;
}

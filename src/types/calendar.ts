export type AppRole = "owner" | "admin" | "employee" | "customer";

export interface CalendarResource {
  id: string;
  name: string;
  role: AppRole | "unknown";
  showInCalendar: boolean;
  isBookable: boolean;
  canReceiveServiceBookings: boolean;
  canCreatePrivateNotes: boolean;
  orderIndex: number;
  color: string | null;
}

export type CalendarEventType =
  | "service_booking"
  | "blocked_time"
  | "private_note"
  | "internal_event"
  | "admin_booking_note";

export interface CalendarEvent {
  id: string;
  resourceId: string;
  start: string;
  end: string;
  type: CalendarEventType;
  title: string;
  note: string | null;
  visibility: "private" | "team" | string;
  linkedReservationId: string | null;
}

export interface ServiceReservation {
  id: string;
  serviceId: string;
  providerEmployeeId: string;
  clientId: string;
  start: string;
  end: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
}

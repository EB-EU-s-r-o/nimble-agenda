import Dexie, { type Table } from "dexie";

export interface OfflineAppointment {
  id: string;
  start_at: string;
  end_at: string;
  customer_name: string;
  customer_phone?: string;
  employee_id?: string;
  employee_name?: string;
  service_id?: string;
  service_name?: string;
  price_total?: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  updated_at: string;
  synced?: boolean;
}

export type OfflineAction =
  | { type: "APPOINTMENT_CREATE"; payload: OfflineAppointment; idempotency_key: string; created_at: string }
  | { type: "APPOINTMENT_UPDATE"; payload: Partial<OfflineAppointment> & { id: string }; idempotency_key: string; created_at: string }
  | { type: "APPOINTMENT_CANCEL"; payload: { id: string; reason?: string }; idempotency_key: string; created_at: string };

export interface QueueItem {
  id?: number;
  action: OfflineAction;
  status: "pending" | "processing" | "done" | "failed" | "conflict";
  last_error?: string;
  created_at: string;
}

class OfflineDB extends Dexie {
  appointments!: Table<OfflineAppointment, string>;
  queue!: Table<QueueItem, number>;
  meta!: Table<{ key: string; value: string }, string>;

  constructor() {
    super("booking_offline_db");
    this.version(1).stores({
      appointments: "id, start_at, end_at, status, updated_at",
      queue: "++id, status, created_at",
      meta: "key",
    });
  }
}

export const db = new OfflineDB();

import { openDB, type IDBPDatabase } from "idb";

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

export interface ConflictSuggestion {
  start_at: string;
  end_at: string;
}

export interface QueueItem {
  id?: number;
  action: OfflineAction;
  status: "pending" | "processing" | "done" | "failed" | "conflict";
  last_error?: string;
  conflict_suggestion?: ConflictSuggestion;
  appointment_id?: string;
  created_at: string;
}

const DB_NAME = "booking_offline_db";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

export function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("appointments")) {
          const aptStore = db.createObjectStore("appointments", { keyPath: "id" });
          aptStore.createIndex("start_at", "start_at");
          aptStore.createIndex("status", "status");
        }
        if (!db.objectStoreNames.contains("queue")) {
          const qStore = db.createObjectStore("queue", { keyPath: "id", autoIncrement: true });
          qStore.createIndex("status", "status");
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
      },
    });
  }
  return dbPromise;
}

/** Returns the DB or null if IndexedDB is unavailable (e.g. private mode). Use when offline features are optional. */
export async function getDBOrNull(): Promise<IDBPDatabase | null> {
  try {
    return await getDB();
  } catch {
    return null;
  }
}

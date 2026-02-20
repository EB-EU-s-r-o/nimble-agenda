import { db, type OfflineAppointment, type QueueItem } from "./db";

function isoNow() {
  return new Date().toISOString();
}

function makeKey(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function upsertLocalAppointment(appt: OfflineAppointment) {
  await db.appointments.put(appt);
}

export async function listLocalAppointmentsForDay(dayISO: string) {
  const start = `${dayISO}T00:00:00.000Z`;
  const end = `${dayISO}T23:59:59.999Z`;
  return db.appointments
    .where("start_at")
    .between(start, end, true, true)
    .toArray();
}

export async function enqueueAction(action: QueueItem["action"], appointmentId?: string) {
  await db.queue.add({
    action,
    status: "pending",
    appointment_id: appointmentId,
    created_at: isoNow(),
  });
}

export async function createAppointmentOffline(
  input: Omit<OfflineAppointment, "updated_at">
): Promise<OfflineAppointment> {
  const appt: OfflineAppointment = { ...input, updated_at: isoNow(), synced: false };
  await upsertLocalAppointment(appt);

  await enqueueAction({
    type: "APPOINTMENT_CREATE",
    payload: appt,
    idempotency_key: makeKey("create"),
    created_at: isoNow(),
  }, appt.id);

  return appt;
}

export async function updateAppointmentOffline(
  patch: { id: string } & Partial<OfflineAppointment>
): Promise<OfflineAppointment> {
  const existing = await db.appointments.get(patch.id);
  if (!existing) throw new Error("Appointment not found locally");

  const merged: OfflineAppointment = {
    ...existing,
    ...patch,
    updated_at: isoNow(),
    synced: false,
  };

  await upsertLocalAppointment(merged);

  await enqueueAction({
    type: "APPOINTMENT_UPDATE",
    payload: { ...patch, id: patch.id },
    idempotency_key: makeKey("update"),
    created_at: isoNow(),
  }, patch.id);

  return merged;
}

export async function cancelAppointmentOffline(id: string, reason?: string) {
  const existing = await db.appointments.get(id);
  if (!existing) throw new Error("Appointment not found locally");

  const updated: OfflineAppointment = {
    ...existing,
    status: "cancelled",
    updated_at: isoNow(),
    synced: false,
  };

  await upsertLocalAppointment(updated);

  await enqueueAction({
    type: "APPOINTMENT_CANCEL",
    payload: { id, reason },
    idempotency_key: makeKey("cancel"),
    created_at: isoNow(),
  }, id);

  return updated;
}

export function isOnline() {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

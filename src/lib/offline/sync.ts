import { db, type OfflineAction } from "./db";
import { supabase } from "@/integrations/supabase/client";

function getAppointmentId(action: OfflineAction): string | undefined {
  if ("payload" in action && action.payload && "id" in action.payload) {
    return action.payload.id;
  }
  return undefined;
}

interface SyncResponse {
  ok: boolean;
  applied?: number;
  conflicts?: Array<{
    idempotency_key: string;
    reason: string;
    server_suggestion?: { start_at: string; end_at: string };
  }>;
  error?: string;
}

export async function runSync() {
  // 1) PUSH pending actions
  const pending = await db.queue
    .where("status")
    .anyOf(["pending", "failed"])
    .toArray();

  if (pending.length) {
    for (const item of pending) {
      if (!item.id) continue;
      await db.queue.update(item.id, { status: "processing", last_error: undefined });

      try {
        const { data, error } = await supabase.functions.invoke("sync-push", {
          body: { actions: [item.action] },
        });

        if (error) {
          await db.queue.update(item.id, {
            status: "failed",
            last_error: error.message || "sync failed",
          });
          continue;
        }

        const resp = data as SyncResponse;

        if (resp.ok) {
          if (resp.conflicts?.length) {
            const conflict = resp.conflicts[0];
            await db.queue.update(item.id, {
              status: "conflict",
              last_error: conflict.reason,
              conflict_suggestion: conflict.server_suggestion || undefined,
              appointment_id: getAppointmentId(item.action),
            });
          } else {
            await db.queue.update(item.id, { status: "done" });
          }
        } else {
          await db.queue.update(item.id, {
            status: "failed",
            last_error: resp.error || "sync failed",
          });
        }
      } catch (e: any) {
        await db.queue.update(item.id, {
          status: "failed",
          last_error: e?.message || "network error",
        });
      }
    }
  }

  // 2) PULL latest snapshot (today + tomorrow)
  try {
    const { data, error } = await supabase.functions.invoke("sync-pull", {
      body: { days: 2 },
    });

    if (!error && data?.appointments && Array.isArray(data.appointments)) {
      await db.appointments.bulkPut(
        data.appointments.map((a: any) => ({ ...a, synced: true }))
      );
    }
  } catch {
    // ignore pull errors when offline
  }
}

export function installAutoSync() {
  if (typeof window === "undefined") return;

  const kick = () => {
    if (navigator.onLine) runSync();
  };

  window.addEventListener("online", kick);
  const t = setInterval(kick, 30_000);

  return () => {
    window.removeEventListener("online", kick);
    clearInterval(t);
  };
}

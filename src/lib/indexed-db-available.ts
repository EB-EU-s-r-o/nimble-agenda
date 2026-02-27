/**
 * Test if IndexedDB is available (e.g. not in private mode or blocked).
 * If unavailable, unregister service workers so Workbox does not throw
 * "Internal error opening backing store for indexedDB.open" in Strategy.js.
 */
const TEST_DB = "_idb_availability_check";

export function isIndexedDBAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(false);
      return;
    }
    const req = indexedDB.open(TEST_DB, 1);
    req.onsuccess = () => {
      req.result?.close();
      indexedDB.deleteDatabase(TEST_DB);
      resolve(true);
    };
    req.onerror = () => resolve(false);
    req.onblocked = () => resolve(false);
  });
}

export async function ensureStorageAndServiceWorker(): Promise<void> {
  const ok = await isIndexedDBAvailable();
  if (ok) return;
  if ("serviceWorker" in navigator) {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) await reg.unregister();
  }
}

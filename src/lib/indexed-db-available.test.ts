import { describe, it, expect } from "vitest";
import { isIndexedDBAvailable, ensureStorageAndServiceWorker } from "./indexed-db-available";

describe("indexed-db-available", () => {
  describe("isIndexedDBAvailable", () => {
    it("resolves to a boolean", async () => {
      const result = await isIndexedDBAvailable();
      expect(typeof result).toBe("boolean");
    });

    it("resolves false when indexedDB is undefined", async () => {
      const orig = globalThis.indexedDB;
      try {
        (globalThis as unknown as { indexedDB: unknown }).indexedDB = undefined;
        const result = await isIndexedDBAvailable();
        expect(result).toBe(false);
      } finally {
        (globalThis as unknown as { indexedDB: unknown }).indexedDB = orig;
      }
    });
  });

  describe("ensureStorageAndServiceWorker", () => {
    it("resolves without throwing", async () => {
      await expect(ensureStorageAndServiceWorker()).resolves.toBeUndefined();
    });

    it("does not throw when serviceWorker is missing", async () => {
      const orig = (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
      try {
        delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker;
        await expect(ensureStorageAndServiceWorker()).resolves.toBeUndefined();
      } finally {
        (navigator as unknown as { serviceWorker: unknown }).serviceWorker = orig;
      }
    });
  });
});

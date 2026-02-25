import { describe, expect, it } from "vitest";
import {
  BLOCK_SERVICE_NAME,
  BLOCK_TAG,
  getBlockedReason,
  isBlockedAppointmentNote,
  makeBlockedNote,
} from "./blocking";

describe("blocking helpers", () => {
  it("detects blocked notes with tag", () => {
    expect(isBlockedAppointmentNote("[BLOCK] Obed")).toBe(true);
    expect(isBlockedAppointmentNote("   [BLOCK] Dovolenka")).toBe(true);
    expect(isBlockedAppointmentNote("Poznamka bez tagu")).toBe(false);
  });

  it("extracts blocked reason with fallback", () => {
    expect(getBlockedReason("[BLOCK] Pauza")).toBe("Pauza");
    expect(getBlockedReason("[BLOCK]")).toBe(BLOCK_SERVICE_NAME);
    expect(getBlockedReason(null)).toBe(BLOCK_SERVICE_NAME);
  });

  it("creates stable blocked note payload", () => {
    expect(makeBlockedNote("Interné")).toBe(`${BLOCK_TAG} Interné`);
    expect(makeBlockedNote("   ")).toBe(`${BLOCK_TAG} ${BLOCK_SERVICE_NAME}`);
  });
});

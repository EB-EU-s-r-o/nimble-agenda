import { describe, expect, it } from "vitest";
import { resolveBookingTenantHint } from "@/lib/tenantResolver";

describe("resolveBookingTenantHint", () => {
  it("prefers host-derived slug over conflicting ?slug query", () => {
    const url = new URL("https://booking.alpha.example.com/booking?slug=beta");

    const hint = resolveBookingTenantHint(url);

    expect(hint.slug).toBe("alpha");
  });

  it("uses ?slug query when host does not resolve a slug", () => {
    const url = new URL("https://example.com/booking?slug=tenant-1");

    const hint = resolveBookingTenantHint(url);

    expect(hint.slug).toBe("tenant-1");
  });

  it("returns null slug on localhost/preview hosts without query slug", () => {
    const localhost = resolveBookingTenantHint(new URL("http://localhost:4173/booking"));
    const loopback = resolveBookingTenantHint(new URL("http://127.0.0.1:4174/booking"));

    expect(localhost.slug).toBeNull();
    expect(loopback.slug).toBeNull();
  });

  it("keeps ?business_id available only as a hint payload", () => {
    const url = new URL("http://localhost:4173/booking?business_id=dev-id");

    const hint = resolveBookingTenantHint(url);

    expect(hint.devBusinessId).toBe("dev-id");
    expect(hint.slug).toBeNull();
  });
});

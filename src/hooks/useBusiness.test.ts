import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBusiness, DEMO_BUSINESS_ID } from "./useBusiness";

const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mockUseAuth() }));

describe("useBusiness", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      profile: null,
      memberships: [],
      loading: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    });
  });

  it("returns DEMO_BUSINESS_ID when no memberships", () => {
    const { result } = renderHook(() => useBusiness());
    expect(result.current.businessId).toBe(DEMO_BUSINESS_ID);
    expect(result.current.role).toBeNull();
  });

  it("returns business_id and role when one membership", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "a@b.sk", uid: "u1" },
      session: null,
      profile: null,
      memberships: [{ id: "m1", business_id: "b-123", profile_id: "u1", role: "owner" }],
      loading: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    });
    const { result } = renderHook(() => useBusiness());
    expect(result.current.businessId).toBe("b-123");
    expect(result.current.role).toBe("owner");
    expect(result.current.isOwnerOrAdmin).toBe(true);
  });

  it("prefers owner over admin", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "a@b.sk", uid: "u1" },
      session: null,
      profile: null,
      memberships: [
        { id: "m1", business_id: "b-a", profile_id: "u1", role: "admin" },
        { id: "m2", business_id: "b-o", profile_id: "u1", role: "owner" },
      ],
      loading: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    });
    const { result } = renderHook(() => useBusiness());
    expect(result.current.role).toBe("owner");
    expect(result.current.businessId).toBe("b-o");
  });

  it("isEmployee true for employee role", () => {
    mockUseAuth.mockReturnValue({
      user: { id: "u1", email: "a@b.sk", uid: "u1" },
      session: null,
      profile: null,
      memberships: [{ id: "m1", business_id: "b1", profile_id: "u1", role: "employee" }],
      loading: false,
      signOut: vi.fn(),
      refreshProfile: vi.fn(),
    });
    const { result } = renderHook(() => useBusiness());
    expect(result.current.isEmployee).toBe(true);
    expect(result.current.isOwnerOrAdmin).toBe(false);
  });
});

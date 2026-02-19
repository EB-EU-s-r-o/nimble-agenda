import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";

export const DEMO_BUSINESS_ID = "a1b2c3d4-0000-0000-0000-000000000001";

export function useBusiness() {
  const { memberships } = useAuth();

  const activeMembership = useMemo(() => {
    if (!memberships.length) return null;
    // prefer owner > admin > employee > customer
    const order = ["owner", "admin", "employee", "customer"];
    return memberships.sort((a, b) => order.indexOf(a.role) - order.indexOf(b.role))[0];
  }, [memberships]);

  const businessId = activeMembership?.business_id ?? DEMO_BUSINESS_ID;
  const role = activeMembership?.role ?? null;

  const isOwnerOrAdmin = role === "owner" || role === "admin";
  const isEmployee = role === "employee";
  const isOwner = role === "owner";

  return { businessId, role, isOwnerOrAdmin, isEmployee, isOwner, activeMembership };
}

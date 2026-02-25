import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  allowedRoles?: Array<"owner" | "admin" | "employee" | "customer">;
}

export default function ProtectedRoute({ children, requireAdmin = false, allowedRoles }: ProtectedRouteProps) {
  const { user, memberships, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  if (requireAdmin) {
    const hasAdmin = memberships.some((m) => m.role === "owner" || m.role === "admin" || m.role === "employee");
    if (!hasAdmin) return <Navigate to="/" replace />;
  }

  if (allowedRoles?.length) {
    const userRoles = new Set(memberships.map((m) => m.role));
    const hasAllowedRole = allowedRoles.some((role) => userRoles.has(role));

    if (!hasAllowedRole) {
      const fallback = userRoles.has("employee") ? "/admin/my" : "/admin";
      return <Navigate to={fallback} replace />;
    }
  }

  return <>{children}</>;
}

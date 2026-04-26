import { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../lib/auth";

type AuthGuardProps = {
  children?: ReactNode;
  requiredRoles?: UserRole[];
};

export function AuthGuard({ children, requiredRoles }: AuthGuardProps) {
  const { user, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kohei-background text-kohei-text">
        <div className="text-sm uppercase tracking-widest text-kohei-muted">Checking access...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kohei-background text-kohei-text">
        <div className="max-w-md rounded-2xl bg-kohei-card p-6 text-center">
          <h2 className="text-xl font-semibold">Access restricted</h2>
          <p className="mt-2 text-sm text-kohei-muted">
            Your account does not have permission to view this area.
          </p>
        </div>
      </div>
    );
  }

  if (children) {
    return <>{children}</>;
  }

  return <Outlet />;
}

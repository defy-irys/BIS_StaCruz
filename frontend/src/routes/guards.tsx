import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { hasPermission, useAuthStore } from "@/store/authStore";
import type { Permission, RoleKey } from "@/types";

/**
 * Reusable route protection. Authentication and authorisation are checked in
 * ONE place - individual routes only declare what they need.
 *
 * NOTE: this is a frontend simulation for UX purposes. Real authorisation is
 * enforced by the FastAPI backend.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

export function RequireRole({
  roles,
  children,
}: {
  roles: RoleKey[];
  children: ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}

export function RequirePermission({
  permission,
  children,
}: {
  permission?: Permission | Permission[];
  children: ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(user, permission)) return <Navigate to="/unauthorized" replace />;
  return <>{children}</>;
}

/** Sends an already-authenticated user to the correct home surface. */
export function landingPathFor(role: RoleKey | undefined) {
  if (!role) return "/login";
  return role === "resident" ? "/portal" : "/admin";
}

import { db, logActivity } from "@/mock/db";
import type { AuthSession, AuthUser, LoginPayload } from "@/types";
import { ApiError, clone, mockRequest, setAuthToken } from "./http";

/**
 * Simulated password used by every demo account.
 */
export const DEMO_PASSWORD = "bims2026";

export const DEMO_ACCOUNTS = [
  { label: "Super Administrator", identifier: "superadmin", hint: "Full access incl. RBAC" },
  { label: "Administrator", identifier: "admin.ventura", hint: "Records, transactions, users" },
  { label: "Barangay Staff", identifier: "staff.carpio", hint: "Front-desk operations" },
  { label: "Resident", identifier: "resident.dalisay", hint: "Mobile self-service portal" },
  { label: "Inactive account", identifier: "staff.robles", hint: "Demonstrates a blocked login" },
];

function toAuthUser(userId: string): AuthUser {
  const user = db.users.find((u) => u.id === userId)!;
  const role = db.roles.find((r) => r.key === user.role)!;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    roleName: role.name,
    permissions: clone(role.permissions),
    residentId: user.residentId ?? undefined,
    position: user.position,
    lastLoginAt: user.lastLoginAt ?? undefined,
  };
}

export const authService = {
  /** POST /auth/login */
  async login(payload: LoginPayload): Promise<AuthSession> {
    return mockRequest(
      () => {
        const identifier = payload.identifier.trim().toLowerCase();
        const user = db.users.find(
          (u) => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier,
        );
        if (!user) throw new ApiError("Invalid username or password.", 401);
        if (payload.password !== DEMO_PASSWORD) {
          throw new ApiError("Invalid username or password.", 401);
        }
        if (user.status !== "Active") {
          throw new ApiError(
            `This account is ${user.status.toLowerCase()}. Please contact the system administrator.`,
            403,
          );
        }
        user.lastLoginAt = new Date().toISOString();
        const session: AuthSession = {
          accessToken: `mock.access.${user.id}.${Date.now()}`,
          refreshToken: `mock.refresh.${user.id}.${Date.now()}`,
          tokenType: "bearer",
          expiresIn: 3600,
          user: toAuthUser(user.id),
        };
        setAuthToken(session.accessToken);
        if (user.role !== "resident") {
          logActivity({
            actor: user.fullName,
            action: "Signed in",
            module: "Authentication",
            description: `${user.fullName} signed in to the administrative portal.`,
          });
        }
        return session;
      },
      { min: 420, max: 900 },
    );
  },

  /** POST /auth/logout */
  async logout(): Promise<void> {
    setAuthToken(null);
    return mockRequest(() => undefined, { min: 120, max: 240 });
  },

  /** GET /auth/me  re-hydrates permissions after a page refresh. */
  async me(userId: string): Promise<AuthUser> {
    return mockRequest(() => {
      const exists = db.users.some((u) => u.id === userId);
      if (!exists) throw new ApiError("Session expired.", 401);
      return toAuthUser(userId);
    });
  },
};

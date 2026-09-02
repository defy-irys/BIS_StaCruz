import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser, LoginPayload, Permission } from "@/types";
import { authService } from "@/services/authService";
import { setAuthToken } from "@/services/http";

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  status: "idle" | "authenticating";
  error: string | null;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  clearError: () => void;
  hydrate: () => void;
  /** Re-fetches permissions (e.g. after an RBAC change). */
  refreshPermissions: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      status: "idle",
      error: null,

      async login(payload) {
        set({ status: "authenticating", error: null });
        try {
          const session = await authService.login(payload);
          setAuthToken(session.accessToken);
          set({
            user: session.user,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            status: "idle",
            error: null,
          });
          return session.user;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unable to sign in.";
          set({ status: "idle", error: message });
          throw err;
        }
      },

      async logout() {
        await authService.logout();
        setAuthToken(null);
        set({ user: null, accessToken: null, refreshToken: null, error: null });
      },

      clearError() {
        set({ error: null });
      },

      hydrate() {
        const token = get().accessToken;
        if (token) setAuthToken(token);
      },

      async refreshPermissions() {
        const current = get().user;
        if (!current) return;
        try {
          const fresh = await authService.me(current.id);
          set({ user: fresh });
        } catch {
          set({ user: null, accessToken: null, refreshToken: null });
        }
      },
    }),
    {
      name: "bims-bips.session",
      partialize: (s) => ({
        user: s.user,
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
      }),
    },
  ),
);

/*Selectors / helpers*/

export function useCurrentUser() {
  return useAuthStore((s) => s.user);
}

export function useHasPermission() {
  const user = useAuthStore((s) => s.user);
  return (permission?: Permission | Permission[]) => {
    if (!permission) return true;
    if (!user) return false;
    const needed = Array.isArray(permission) ? permission : [permission];
    return needed.some((p) => user.permissions.includes(p));
  };
}

export function hasPermission(user: AuthUser | null, permission?: Permission | Permission[]) {
  if (!permission) return true;
  if (!user) return false;
  const needed = Array.isArray(permission) ? permission : [permission];
  return needed.some((p) => user.permissions.includes(p));
}

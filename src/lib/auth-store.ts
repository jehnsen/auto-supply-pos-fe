"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState } from "react";
import { apiRequest, ApiError, AUTH_STORAGE_KEY } from "./api/client";
import { getCurrentUser, logoutRequest } from "./api/auth";
import { getPosBootstrap } from "./api/pos";

export interface AuthStoreInfo {
  id: number;
  uuid: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
}

export interface AuthBranch {
  id: number;
  uuid: string;
  name: string;
  is_main: boolean;
}

export interface AuthUser {
  uuid: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  email_verified_at: string | null;
  created_at: string;
  store: AuthStoreInfo;
  branch: AuthBranch;
}

interface LoginResponse {
  token: string;
  token_type: string;
  user: AuthUser;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  /** Granular permission keys (e.g. "products.edit") for the current user. Owner ignores this and is always unrestricted. */
  permissions: string[];
  status: "idle" | "loading" | "error";
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-fetches the current user to confirm the stored token is still valid; clears it if not. */
  refreshUser: () => Promise<boolean>;
}

/**
 * Loads the caller's own effective permissions from `GET /pos/bootstrap` — the only
 * self-readable source (the `/settings/permissions/*` endpoints are owner-only and
 * 403 for everyone else). Owner comes back as `["*"]`, which `hasPermission` treats
 * as "all granted".
 */
async function fetchPermissions(user: AuthUser): Promise<string[]> {
  if (user.role === "owner") return ["*"];
  try {
    const res = await getPosBootstrap();
    return res.permissions ?? [];
  } catch {
    return [];
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      permissions: [],
      status: "idle",
      error: null,

      login: async (email, password) => {
        set({ status: "loading", error: null });
        try {
          const data = await apiRequest<LoginResponse>("/auth/login", {
            method: "POST",
            body: { email, password },
            auth: false,
          });
          set({ token: data.token, user: data.user, status: "idle", error: null });
          const permissions = await fetchPermissions(data.user);
          set({ permissions });
        } catch (err) {
          const message = err instanceof ApiError ? err.message : "Unable to sign in";
          set({ status: "error", error: message });
          throw err;
        }
      },

      logout: async () => {
        try {
          await logoutRequest();
        } catch {
          // Best-effort: clear local state regardless of whether the server call succeeded.
        }
        set({ token: null, user: null, permissions: [], status: "idle", error: null });
      },

      refreshUser: async () => {
        try {
          const user = await getCurrentUser();
          const permissions = await fetchPermissions(user);
          set({ user, permissions });
          return true;
        } catch {
          set({ token: null, user: null, permissions: [] });
          return false;
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ token: s.token, user: s.user, permissions: s.permissions }),
    }
  )
);

/** Gate rendering until the persisted auth store has rehydrated (avoids SSR/first-paint flicker). */
export function useAuthHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true));
    if (useAuthStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}

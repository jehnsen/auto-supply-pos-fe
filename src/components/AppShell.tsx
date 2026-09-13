"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { ReactNode } from "react";
import Shell from "./Shell";
import { useAuthHydrated, useAuthStore } from "@/lib/auth-store";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { Spinner } from "@/components/ui";

const PUBLIC_ROUTES = new Set(["/", "/login"]);

export default function AppShell({ children }: { children: ReactNode }) {
  const rawPathname = usePathname();
  // Static export builds with trailingSlash: true, so the browser URL is "/login/" not "/login".
  const pathname = rawPathname.length > 1 ? rawPathname.replace(/\/$/, "") : rawPathname;
  const router = useRouter();
  const hydrated = useAuthHydrated();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const verified = useRef(false);
  const canManageSettings = hasPermission(user?.role, permissions, PERMISSIONS.SETTINGS_MANAGE_STORE);

  useEffect(() => {
    if (!hydrated) return;
    if (!token && !isPublicRoute) router.replace("/login");
    // Signed-in users skip the login form and the marketing landing page.
    if (token && (pathname === "/login" || pathname === "/")) router.replace("/dashboard");
    if (token && pathname.startsWith("/settings") && !canManageSettings) router.replace("/dashboard");
  }, [hydrated, token, isPublicRoute, pathname, canManageSettings, router]);

  // Validate a persisted token is still accepted by the backend (e.g. revoked/expired since last visit).
  useEffect(() => {
    if (!hydrated || !token || verified.current) return;
    verified.current = true;
    refreshUser().then((ok) => {
      if (!ok) router.replace("/login");
    });
  }, [hydrated, token, refreshUser, router]);

  if (isPublicRoute) return <>{children}</>;

  const settingsBlocked = pathname.startsWith("/settings") && !canManageSettings;

  if (!hydrated || !token || settingsBlocked) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return <Shell>{children}</Shell>;
}

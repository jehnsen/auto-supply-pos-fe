"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Warehouse,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Factory,
  Truck,
  ClipboardList,
  Landmark,
  ClipboardCheck,
  Wallet,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
  Moon,
  Sun,
  Wrench,
  ClipboardPlus,
  PackageCheck,
  Search,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { getLowStockReport } from "@/lib/api/reports";
import { getTicketCounts } from "@/lib/api/service-tickets";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { useTheme } from "@/lib/theme";
import { cx } from "@/lib/utils";
import { ImmerSonsMark } from "./ImmerSonsMark";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Match this path exactly — for a parent route that has children in the same group. */
  exact?: boolean;
  settingsOnly?: boolean;
  /** Which live count, if any, rides on this row. */
  badge?: "lowStock" | "openJobs";
}

/**
 * Grouped so the rail reads as three jobs rather than sixteen links: what happens at the
 * counter, what the shop holds, and what the office reconciles.
 */
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Counter",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/pos", label: "Point of sale", icon: ShoppingCart },
      { href: "/service-tickets/intake", label: "New job order", icon: ClipboardPlus },
      { href: "/service-tickets", label: "Repair board", icon: Wrench, exact: true, badge: "openJobs" },
      { href: "/service-tickets/release", label: "Release", icon: PackageCheck },
      { href: "/shifts", label: "Shifts", icon: ClipboardCheck },
    ],
  },
  {
    title: "Shop",
    items: [
      { href: "/products", label: "Products", icon: Package },
      { href: "/inventory", label: "Inventory", icon: Warehouse, badge: "lowStock" },
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/suppliers", label: "Suppliers", icon: Factory },
      { href: "/purchase-orders", label: "Purchase orders", icon: ClipboardList },
      { href: "/deliveries", label: "Deliveries", icon: Truck },
    ],
  },
  {
    title: "Office",
    items: [
      { href: "/accounts-payable", label: "Accounts payable", icon: Landmark },
      { href: "/accounts-receivable", label: "Accounts receivable", icon: Wallet },
      { href: "/reports", label: "Reports", icon: BarChart3 },
      { href: "/settings", label: "Settings", icon: Settings, settingsOnly: true },
    ],
  },
];

export default function Shell({ children }: { children: ReactNode }) {
  const rawPathname = usePathname();
  /*
   * `trailingSlash: true` means the browser reports "/service-tickets/", not
   * "/service-tickets". An exact-match nav row would never light up without this — which
   * is why only the Repair Board failed to highlight: its siblings match by prefix, and a
   * prefix test tolerates the extra slash. AppShell normalises the same way.
   */
  const pathname = rawPathname.length > 1 ? rawPathname.replace(/\/$/, "") : rawPathname;
  const router = useRouter();
  const { theme, toggle: toggleTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const logout = useAuthStore((s) => s.logout);
  const storeName = user?.store.name ?? "";
  const canManageSettings = hasPermission(user?.role, permissions, PERMISSIONS.SETTINGS_MANAGE_STORE);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [openTicketCount, setOpenTicketCount] = useState(0);
  const [collapsed, setCollapsed] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getLowStockReport()
      .then((res) => setLowStockCount(res.count))
      .catch(() => {});
  }, []);

  // Re-read on navigation so the badge reflects tickets opened or released elsewhere in the app.
  useEffect(() => {
    getTicketCounts()
      .then((res) => setOpenTicketCount(res.open))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored) setCollapsed(stored === "true");
  }, []);

  // "/" focuses the global search, the way it does in the reference.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = !!target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }

  async function onLogout() {
    await logout();
    router.replace("/login");
  }

  function badgeFor(item: NavItem): number {
    if (item.badge === "lowStock") return lowStockCount;
    if (item.badge === "openJobs") return openTicketCount;
    return 0;
  }

  const initials = (user?.name ?? "")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    // `app-square` zeroes radii app-wide — the rail and top bar included, so the whole
    // chrome shares one edge treatment rather than only the content area.
    <div className="app-square flex h-screen">
      <aside
        className={cx(
          "mech fixed inset-y-0 left-0 z-40 flex flex-col border-r transition-[width] duration-200",
          collapsed ? "w-16" : "w-16 lg:w-60"
        )}
        style={{ background: "var(--sidebar-bg)", borderColor: "var(--sidebar-border)" }}
      >
        {/* Wordmark plate — brushed, seated on its own seam like a bolted nameplate. */}
        <div
          className="brushed flex h-14 shrink-0 items-center gap-2.5 border-b px-3 lg:px-4"
          style={{ borderColor: "var(--seam)" }}
        >
          <ImmerSonsMark size={30} className="shrink-0" />
          <div className={cx("min-w-0 leading-tight", collapsed ? "hidden" : "hidden lg:block")}>
            <p className="truncate text-[13px] font-semibold text-ink">{storeName || "ImmerSons AutoMoto"}</p>
            <p className="tech-label" style={{ color: "var(--sidebar-ink-muted)" }}>
              Auto Care
            </p>
          </div>
        </div>

        <nav className="scrollbar-hidden flex flex-1 flex-col gap-4 overflow-y-auto px-2 pb-2 lg:px-3">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((i) => !i.settingsOnly || canManageSettings);
            if (items.length === 0) return null;
            return (
              <div key={group.title}>
                <p
                  className={cx(
                    "tech-label mb-1 flex items-center gap-2 px-2",
                    collapsed ? "hidden" : "hidden lg:flex dot-leader"
                  )}
                  style={{ color: "var(--sidebar-ink-muted)" }}
                >
                  {group.title}
                </p>
                <div className="flex flex-col gap-0.5">
                  {items.map((item) => {
                    // The board sits at the parent path of intake/release, so it needs an
                    // exact match or it would highlight for all three.
                    const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    const count = badgeFor(item);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        prefetch={false}
                        title={item.label}
                        className="mech relative flex items-center gap-2.5 rounded-[0.3rem] px-2.5 py-2 text-[13px] font-medium transition-colors"
                        style={
                          active
                            ? { background: "var(--sidebar-active-bg)", color: "var(--sidebar-active-ink)" }
                            : { color: "var(--sidebar-ink)" }
                        }
                      >
                        {/* Active marker: a lit bar on the rail edge, like a switched circuit. */}
                        {active && (
                          <span
                            aria-hidden
                            className="absolute inset-y-1 left-0 w-[3px] rounded-r-[2px]"
                            style={{
                              background: "var(--sidebar-active-ink)",
                              boxShadow: "0 0 8px var(--glow-brand)",
                            }}
                          />
                        )}
                        <Icon size={17} className="shrink-0" />
                        <span className={cx("flex-1 truncate", collapsed ? "hidden" : "hidden lg:block")}>
                          {item.label}
                        </span>
                        {count > 0 && (
                          <span
                            className={cx(
                              "readout rounded-[0.2rem] border px-1 text-[10px] font-semibold",
                              collapsed ? "hidden" : "hidden lg:block"
                            )}
                            style={{
                              color: active ? "var(--sidebar-active-ink)" : "var(--sidebar-ink-muted)",
                              borderColor: "var(--seam)",
                            }}
                          >
                            {count}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer: reference-guide and the collapse control */}
        <div className="shrink-0 border-t px-2 py-2 lg:px-3" style={{ borderColor: "var(--sidebar-border)" }}>
          <Link
            href="/docs"
            prefetch={false}
            title="Help & guide"
            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors hover:bg-black/[0.04]"
            style={{ color: pathname.startsWith("/docs") ? "var(--sidebar-active-ink)" : "var(--sidebar-ink)" }}
          >
            <BookOpen size={17} className="shrink-0" />
            <span className={cx("flex-1", collapsed ? "hidden" : "hidden lg:block")}>Help &amp; guide</span>
          </Link>
          <button
            onClick={toggleCollapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="mech flex w-full items-center gap-2.5 rounded-[0.3rem] px-2.5 py-2 text-[13px] font-medium transition-colors hover:bg-black/[0.04] cursor-pointer"
            style={{ color: "var(--sidebar-ink)" }}
          >
            {collapsed ? <PanelLeft size={17} className="shrink-0" /> : <PanelLeftClose size={17} className="shrink-0" />}
            <span className={cx("flex-1 text-left", collapsed ? "hidden" : "hidden lg:block")}>Collapse</span>
            {/* Milled grip band, as on the knurled edge of a tool that gets pulled. */}
            <span
              aria-hidden
              className={cx("knurled h-3.5 w-4 shrink-0 rounded-[2px]", collapsed ? "hidden" : "hidden lg:block")}
            />
          </button>
        </div>
      </aside>

      <div
        className={cx(
          "flex h-screen min-w-0 flex-1 flex-col overflow-hidden transition-[margin] duration-200",
          collapsed ? "ml-16" : "ml-16 lg:ml-60"
        )}
      >
        {/* Top bar: global lookup on the left, shop context and account on the right. */}
        <header
          className="brushed flex h-14 shrink-0 items-center gap-3 border-b px-4"
          style={{ background: "var(--sidebar-bg)", borderColor: "var(--sidebar-border)" }}
        >
          <div className="relative w-full max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              ref={searchRef}
              placeholder="Job order, claim code, plate, or name"
              className="h-9 w-full rounded-[0.3rem] border border-black/12 bg-card pl-9 pr-9 font-mono text-[13px] text-ink placeholder:text-ink-muted focus:outline-2 focus:outline-brand/70"
              style={{ boxShadow: "inset 0 1px 2px var(--bevel-dark)" }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const q = (e.target as HTMLInputElement).value.trim();
                  if (q) router.push(`/service-tickets/release?code=${encodeURIComponent(q)}`);
                }
              }}
            />
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-black/15 bg-black/[0.03] px-1.5 text-[10px] font-semibold text-ink-muted sm:block">
              /
            </kbd>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <span className="tech-label hidden items-center gap-1.5 rounded-[0.3rem] border border-black/12 px-2.5 py-2 text-ink-secondary sm:flex">
              <Building2 size={13} />
              {user?.branch?.name ?? "Main"}
            </span>
            <button
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              className="mech flex h-8 w-8 items-center justify-center rounded-[0.3rem] border border-black/12 text-ink-secondary transition-colors hover:bg-black/[0.04] hover:text-ink cursor-pointer active:translate-y-px"
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <span className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-[0.25rem] bg-brand font-mono text-[11px] font-semibold text-white"
                style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -1px 0 rgba(0,0,0,0.2)" }}
              >
                {initials || "—"}
              </span>
              <span className="hidden text-[13px] font-medium text-ink sm:block">{user?.name ?? ""}</span>
            </span>
            <button
              onClick={onLogout}
              title={user ? `Sign out (${user.email})` : "Sign out"}
              aria-label="Sign out"
              className="mech flex h-8 w-8 items-center justify-center rounded-[0.3rem] border border-black/12 text-ink-secondary transition-colors hover:bg-black/[0.04] hover:text-ink cursor-pointer active:translate-y-px"
            >
              <LogOut size={15} />
            </button>
          </div>
        </header>

        <main className="app-grid min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

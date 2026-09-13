"use client";

import { useAuthStore } from "./auth-store";

/**
 * Role/permission gating. `owner` is an unrestricted super-admin. `manager` and
 * `cashier` are governed by granular permission keys fetched from the backend
 * (`/settings/permissions/user/:uuid`, seeded from `/settings/permissions/role/:role`)
 * and stored on the auth store. This file only controls UI affordances — the
 * API is the actual security boundary.
 */

/** Known permission keys, grouped to match the backend catalog (`/settings/permissions`). */
export const PERMISSIONS = {
  PRODUCTS_VIEW: "products.view",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_EDIT: "products.edit",
  PRODUCTS_DELETE: "products.delete",
  PRODUCTS_ADJUST_STOCK: "products.adjust_stock",
  SALES_VIEW: "sales.view",
  SALES_CREATE: "sales.create",
  SALES_VOID: "sales.void",
  SALES_REFUND: "sales.refund",
  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_CREATE: "customers.create",
  CUSTOMERS_EDIT: "customers.edit",
  CUSTOMERS_DELETE: "customers.delete",
  CUSTOMERS_MANAGE_CREDIT: "customers.manage_credit",
  INVENTORY_VIEW: "inventory.view",
  INVENTORY_RECEIVE: "inventory.receive",
  INVENTORY_ADJUST: "inventory.adjust",
  INVENTORY_TRANSFER: "inventory.transfer",
  REPORTS_VIEW_SALES: "reports.view_sales",
  REPORTS_VIEW_INVENTORY: "reports.view_inventory",
  REPORTS_VIEW_CREDIT: "reports.view_credit",
  REPORTS_EXPORT: "reports.export",
  SETTINGS_MANAGE_STORE: "settings.manage_store",
} as const;

export function hasPermission(role: string | undefined | null, permissions: string[] | undefined, permission: string): boolean {
  if (role === "owner") return true;
  const granted = permissions ?? [];
  // `/pos/bootstrap` returns `["*"]` for fully-privileged roles — treat as all-granted.
  return granted.includes("*") || granted.includes(permission);
}

/** Convenience hook for components that need to check several permissions. */
export function usePermissions() {
  const role = useAuthStore((s) => s.user?.role);
  const permissions = useAuthStore((s) => s.permissions);
  return { role, isOwner: role === "owner", can: (permission: string) => hasPermission(role, permissions, permission) };
}

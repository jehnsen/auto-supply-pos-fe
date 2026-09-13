import { apiRequest } from "./client";

/** Category key (e.g. "products") -> permission key -> human label. */
export type PermissionCatalog = Record<string, Record<string, string>>;

export function getPermissionCatalog(): Promise<PermissionCatalog> {
  return apiRequest<PermissionCatalog>("/settings/permissions");
}

export function getUserPermissions(userId: string): Promise<{ user_id: number; role: string; permissions: string[] }> {
  return apiRequest(`/settings/permissions/user/${userId}`);
}

export function updateUserPermissions(userId: string, permissions: string[]): Promise<void> {
  return apiRequest(`/settings/permissions/user/${userId}`, { method: "PUT", body: { permissions } });
}

export function getRolePermissions(role: string): Promise<{ role: string; permissions: string[] }> {
  return apiRequest(`/settings/permissions/role/${role}`);
}

export function updateRolePermissions(role: string, permissions: string[]): Promise<void> {
  return apiRequest(`/settings/permissions/role/${role}`, { method: "PUT", body: { permissions } });
}

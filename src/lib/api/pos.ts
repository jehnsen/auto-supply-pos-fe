import { apiRequest } from "./client";

/**
 * `GET /pos/bootstrap` — callable by any authenticated role (no role/permission
 * gate), unlike the owner-only `/settings/permissions/*` endpoints. It returns the
 * caller's own effective permissions, so it's the source of truth for hydrating the
 * permission store and gating UI. For `role: "owner"`, `permissions` comes back as
 * `["*"]` (all permissions granted) rather than an enumerated list.
 *
 * The endpoint also returns store profile, tax, payment methods, receipt template,
 * branches, and system settings; only the fields we consume are typed here.
 */
export interface PosBootstrap {
  user: {
    uuid: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    branch_id: number | null;
    is_active: boolean;
  };
  permissions: string[];
  server_time: string;
}

export function getPosBootstrap(): Promise<PosBootstrap> {
  return apiRequest<PosBootstrap>("/pos/bootstrap");
}

import { apiRequest } from "./client";
import type { AuthUser } from "../auth-store";

export function getCurrentUser(): Promise<AuthUser> {
  return apiRequest<AuthUser>("/auth/me");
}

export function logoutRequest(): Promise<void> {
  return apiRequest("/auth/logout", { method: "POST" });
}

export function updateProfile(payload: { name?: string; email?: string; phone?: string }): Promise<AuthUser> {
  return apiRequest<AuthUser>("/auth/profile", { method: "PUT", body: payload });
}

export function changePassword(payload: {
  current_password: string;
  password: string;
  password_confirmation: string;
}): Promise<void> {
  return apiRequest("/auth/change-password", { method: "POST", body: payload });
}

import { apiRequest, apiRequestEnvelope } from "./client";

/* ---------- Store profile ---------- */

export interface StoreProfile {
  store: {
    name: string;
    address: string;
    city: string | null;
    province: string | null;
    postal_code: string | null;
    phone: string;
    email: string;
    website: string | null;
    tin: string | null;
    bir_permit: string | null;
    vat_registered: boolean;
    logo_url: string | null;
  };
  stats: { total_users: number; active_users: number; total_branches: number; storage_used: number };
  created_at: string;
}

export function getStoreProfile(): Promise<StoreProfile> {
  return apiRequest<StoreProfile>("/settings/store");
}

export interface StoreProfileUpdatePayload {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  tin?: string;
  business_hours?: string;
}

export function updateStoreProfile(payload: StoreProfileUpdatePayload): Promise<void> {
  return apiRequest("/settings/store", { method: "PUT", body: payload });
}

/* ---------- Tax settings ---------- */

export interface TaxSettings {
  vat_rate: number;
  vat_inclusive: boolean;
  is_bmbe: boolean;
}

export function getTaxSettings(): Promise<TaxSettings> {
  return apiRequest<TaxSettings>("/settings/tax");
}

export function updateTaxSettings(payload: { vat_rate: number; is_vat_inclusive: boolean; tax_type?: string }): Promise<void> {
  return apiRequest("/settings/tax", { method: "PUT", body: payload });
}

/* ---------- Credit settings ---------- */

export interface CreditSettings {
  default_credit_limit: number;
  default_terms_days: number;
  reminder_days_before: number;
}

export function getCreditSettings(): Promise<CreditSettings> {
  return apiRequest<CreditSettings>("/settings/credit");
}

export function updateCreditSettings(payload: {
  default_credit_limit: number;
  default_terms_days: number;
  auto_send_reminders?: boolean;
  reminder_days_before: number;
}): Promise<void> {
  return apiRequest("/settings/credit", { method: "PUT", body: payload });
}

/* ---------- Payment methods ---------- */

export interface PaymentMethodConfig {
  enabled: boolean;
  name: string;
  api_key_set?: boolean;
}

export type PaymentMethodsSettings = Record<string, PaymentMethodConfig>;

export function getPaymentMethods(): Promise<PaymentMethodsSettings> {
  return apiRequest<PaymentMethodsSettings>("/settings/payment-methods");
}

export function updatePaymentMethods(methods: { code: string; name: string; is_active: boolean }[]): Promise<void> {
  return apiRequest("/settings/payment-methods", { method: "PUT", body: { methods } });
}

/* ---------- Receipt template ---------- */

export interface ReceiptTemplateSettings {
  header_text: string;
  footer_text: string;
  show_logo: boolean;
  paper_width: number;
  show_bir_info: boolean;
  show_cashier: boolean;
  show_customer: boolean;
}

export function getReceiptTemplate(): Promise<ReceiptTemplateSettings> {
  return apiRequest<ReceiptTemplateSettings>("/settings/receipt-template");
}

export function updateReceiptTemplate(payload: {
  header_text?: string;
  footer_text?: string;
  show_logo?: boolean;
  show_tin?: boolean;
  show_address?: boolean;
}): Promise<void> {
  return apiRequest("/settings/receipt-template", { method: "PUT", body: payload });
}

/* ---------- System settings ---------- */

export interface SystemSettings {
  app_version: string;
  timezone: string;
  currency: string;
  date_format: string;
  time_format: string;
  number_format: string;
}

export function getSystemSettings(): Promise<SystemSettings> {
  return apiRequest<SystemSettings>("/settings/system");
}

export function updateSystemSettings(payload: {
  timezone: string;
  currency: string;
  date_format: string;
  time_format: string;
}): Promise<void> {
  return apiRequest("/settings/system", { method: "PUT", body: payload });
}

export function clearSystemCache(): Promise<void> {
  return apiRequest("/settings/system/clear-cache", { method: "POST" });
}

/* ---------- Users ---------- */

export interface StoreUser {
  id: number;
  uuid: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  branch: { id: number; uuid: string; name: string } | null;
  last_login_at: string | null;
  last_login_ip: string | null;
  status: string;
  role_display: string;
  created_at: string;
  updated_at: string;
}

export async function listUsers(page = 1) {
  const envelope = await apiRequestEnvelope<StoreUser[]>("/settings/users", { params: { page } });
  return {
    items: envelope.data ?? [],
    page: envelope.meta?.current_page ?? page,
    lastPage: envelope.meta?.last_page ?? null,
    total: envelope.meta?.total ?? null,
  };
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: string;
  /** Numeric branch id — the API validates against branches.id, not uuid */
  branch_id?: number;
  phone?: string;
}

export function createUser(payload: CreateUserPayload): Promise<StoreUser> {
  return apiRequest<StoreUser>("/settings/users", { method: "POST", body: payload });
}

export function getUser(uuid: string): Promise<{ user: StoreUser; permissions: string[]; recent_activity: unknown[] }> {
  return apiRequest(`/settings/users/${uuid}`);
}

export function updateUser(uuid: string, payload: Partial<CreateUserPayload>): Promise<StoreUser> {
  return apiRequest<StoreUser>(`/settings/users/${uuid}`, { method: "PUT", body: payload });
}

export function deactivateUser(uuid: string): Promise<void> {
  return apiRequest(`/settings/users/${uuid}/deactivate`, { method: "POST" });
}

export function activateUser(uuid: string): Promise<void> {
  return apiRequest(`/settings/users/${uuid}/activate`, { method: "POST" });
}

export function deleteUser(uuid: string): Promise<void> {
  return apiRequest(`/settings/users/${uuid}`, { method: "DELETE" });
}

export function resetUserPassword(uuid: string, password: string): Promise<void> {
  return apiRequest(`/settings/users/${uuid}/reset-password`, {
    method: "POST",
    body: { new_password: password, new_password_confirmation: password },
  });
}

/* ---------- Branches ---------- */

export interface Branch {
  id: number;
  uuid: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  is_main: boolean;
  is_active: boolean;
  users_count: number;
  status: string;
  type: string;
  created_at: string;
  updated_at: string;
}

export function listBranches(): Promise<Branch[]> {
  return apiRequest<Branch[]>("/settings/branches");
}

export interface BranchWritePayload {
  name: string;
  address?: string;
  phone?: string;
  is_active?: boolean;
}

export function createBranch(payload: BranchWritePayload): Promise<Branch> {
  return apiRequest<Branch>("/settings/branches", { method: "POST", body: payload });
}

export function updateBranch(uuid: string, payload: Partial<BranchWritePayload>): Promise<Branch> {
  return apiRequest<Branch>(`/settings/branches/${uuid}`, { method: "PUT", body: payload });
}

export function deleteBranch(uuid: string): Promise<void> {
  return apiRequest(`/settings/branches/${uuid}`, { method: "DELETE" });
}

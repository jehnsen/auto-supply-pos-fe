import { apiRequest, apiRequestEnvelope } from "./client";

export type CustomerType = "walk_in" | "regular" | "bulk_farmer" | "government";
export type PaymentRating = "good" | "fair" | "poor" | null;

export interface Customer {
  uuid: string;
  code: string;
  name: string;
  type: CustomerType;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  tin: string | null;
  business_name: string | null;
  is_active: boolean;
  notes: string | null;
  credit_limit: number;
  credit_terms_days: number;
  total_outstanding: number;
  available_credit: number;
  total_purchases: number;
  payment_rating: PaymentRating;
  last_purchase_date: string | null;
  customer_tier: string | null;
  sales_count: number;
  created_at: string;
  updated_at: string;
}

export interface ListCustomersParams {
  page?: number;
  per_page?: number;
  q?: string;
  type?: CustomerType;
  is_active?: boolean;
  has_outstanding_balance?: boolean;
}

export interface ListCustomersResult {
  items: Customer[];
  page: number;
  perPage: number;
  total: number | null;
  lastPage: number | null;
}

export async function listCustomers(params: ListCustomersParams): Promise<ListCustomersResult> {
  const envelope = await apiRequestEnvelope<Customer[]>("/customers", {
    params: {
      page: params.page,
      per_page: params.per_page,
      q: params.q,
      type: params.type,
      is_active: params.is_active === undefined ? undefined : params.is_active ? 1 : 0,
      has_outstanding_balance: params.has_outstanding_balance ? 1 : undefined,
    },
  });
  return {
    items: envelope.data ?? [],
    page: envelope.meta?.current_page ?? params.page ?? 1,
    perPage: envelope.meta?.per_page ?? params.per_page ?? envelope.data?.length ?? 15,
    total: envelope.meta?.total ?? null,
    lastPage: envelope.meta?.last_page ?? null,
  };
}

export function getCustomer(uuid: string): Promise<Customer> {
  return apiRequest<Customer>(`/customers/${uuid}`);
}

export interface CustomerWritePayload {
  name: string;
  type: CustomerType;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  /** Initial limit at creation only. Changing it later goes through `adjustCreditLimit` (records a reason). */
  credit_limit?: number;
  credit_terms_days?: number;
  business_name?: string | null;
  is_active?: boolean;
}

export function createCustomer(payload: CustomerWritePayload): Promise<Customer> {
  return apiRequest<Customer>("/customers", { method: "POST", body: payload });
}

export function updateCustomer(uuid: string, payload: Partial<CustomerWritePayload>): Promise<Customer> {
  return apiRequest<Customer>(`/customers/${uuid}`, { method: "PUT", body: payload });
}

export function deleteCustomer(uuid: string): Promise<null> {
  return apiRequest<null>(`/customers/${uuid}`, { method: "DELETE" });
}

export interface CreditTransaction {
  id: number;
  uuid: string;
  type: "charge" | "payment" | "adjustment";
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_number: string | null;
  payment_method: string | null;
  description: string;
  notes: string | null;
  transaction_date: string;
  due_date: string | null;
  paid_date: string | null;
  status: string;
  days_overdue: number | null;
  sale_id: number | null;
  sale_number: string | null;
  is_reversed: boolean;
  reversed_at: string | null;
  created_at: string;
}

export async function getCustomerTransactions(uuid: string, page = 1) {
  const envelope = await apiRequestEnvelope<CreditTransaction[]>(`/customers/${uuid}/transactions`, {
    params: { page },
  });
  return {
    items: envelope.data ?? [],
    page: envelope.meta?.current_page ?? page,
    total: envelope.meta?.total ?? null,
    lastPage: envelope.meta?.last_page ?? null,
  };
}

export interface RecordPaymentPayload {
  amount: number;
  payment_method: string;
  reference_number?: string;
  payment_date?: string;
  invoice_ids?: string[];
  notes?: string;
}

export interface RecordPaymentResult {
  transaction: CreditTransaction;
  applied_to: {
    sale_uuid: string;
    sale_number: string;
    amount_applied: number;
    previous_balance: number;
    new_balance: number;
    status: string;
  }[];
  remaining_credit: number;
}

export function recordCustomerPayment(uuid: string, payload: RecordPaymentPayload): Promise<RecordPaymentResult> {
  return apiRequest<RecordPaymentResult>(`/customers/${uuid}/payments`, { method: "POST", body: payload });
}

export function adjustCreditLimit(uuid: string, credit_limit: number, reason: string): Promise<Customer> {
  return apiRequest<Customer>(`/customers/${uuid}/credit-limit`, {
    method: "PUT",
    body: { credit_limit, reason },
  });
}

export interface CustomerStatement {
  customer: {
    uuid: string;
    code: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    credit_limit: number;
    credit_terms_days: number;
  };
  period: { from: string; to: string };
  opening_balance: number;
  transactions: {
    date: string;
    type: string;
    description: string;
    reference: string;
    sale_number: string | null;
    due_date: string | null;
    charges: number;
    payments: number;
    balance: number;
  }[];
  closing_balance: number;
  summary: { total_charges: number; total_payments: number; net_change: number };
}

export function getCustomerStatement(uuid: string, startDate: string, endDate: string): Promise<CustomerStatement> {
  return apiRequest<CustomerStatement>(`/customers/${uuid}/statement`, {
    params: { start_date: startDate, end_date: endDate },
  });
}

export interface CreditOverview {
  total_customers_with_credit: number;
  total_outstanding: number;
  total_credit_limit: number;
  customers_with_balance: number;
  total_available_credit: number;
  average_credit_utilization: number;
}

export function getCreditOverview(): Promise<CreditOverview> {
  return apiRequest<CreditOverview>("/customers/credit/overview");
}

export interface CreditAgingRow {
  customer: {
    uuid: string;
    code: string;
    name: string;
    type: string;
    phone: string | null;
    email: string | null;
    credit_limit: number;
    total_outstanding: number;
  };
  aging: { current: number; days_31_60: number; days_61_90: number; days_over_90: number };
  total_outstanding: number;
  oldest_invoice_days: number;
  credit_utilization: number;
}

export interface CreditAgingReport {
  customers: CreditAgingRow[];
  summary: { current: number; days_31_60: number; days_61_90: number; days_over_90: number; total_outstanding: number };
  customer_count: number;
}

export function getCreditAging(): Promise<CreditAgingReport> {
  return apiRequest<CreditAgingReport>("/customers/credit/aging");
}

export interface OverdueAccount {
  customer: { uuid: string; code: string; name: string; phone: string | null; email: string | null };
  overdue_amount: number;
  days_overdue: number;
  oldest_due_date: string;
  invoice_count: number;
}

export function getOverdueAccounts(): Promise<{ accounts: OverdueAccount[]; total_overdue: number; account_count: number }> {
  return apiRequest("/customers/credit/overdue");
}

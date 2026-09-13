import { apiRequest, apiRequestEnvelope } from "./client";

export type PaymentRating = "good" | "fair" | "poor" | null;

export interface SupplierProductRef {
  uuid: string;
  name: string;
  sku: string;
  supplier_price: number;
  lead_time_days: number;
  is_preferred: boolean;
}

export interface Supplier {
  uuid: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  alternate_phone: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  tin: string | null;
  payment_terms_days: number;
  is_active: boolean;
  notes: string | null;
  total_outstanding: number;
  total_purchases: number;
  payment_rating: PaymentRating;
  total_purchase_orders: number;
  /** Not included by all backend versions; may be absent. */
  payables_count?: number;
  total_purchases_amount?: number;
  last_purchase_date: string | null;
  products_count?: number;
  products?: SupplierProductRef[];
  created_at: string;
  updated_at: string;
}

export interface ListSuppliersParams {
  page?: number;
  per_page?: number;
  q?: string;
  is_active?: boolean;
}

export interface ListSuppliersResult {
  items: Supplier[];
  page: number;
  perPage: number;
  total: number | null;
  lastPage: number | null;
}

export async function listSuppliers(params: ListSuppliersParams = {}): Promise<ListSuppliersResult> {
  const envelope = await apiRequestEnvelope<Supplier[]>("/suppliers", {
    params: {
      page: params.page,
      per_page: params.per_page,
      q: params.q,
      is_active: params.is_active === undefined ? undefined : params.is_active ? 1 : 0,
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

export function getSupplier(uuid: string): Promise<Supplier> {
  return apiRequest<Supplier>(`/suppliers/${uuid}`);
}

export interface SupplierWritePayload {
  name: string;
  contact_person?: string | null;
  email?: string | null;
  phone?: string | null;
  alternate_phone?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  postal_code?: string | null;
  tin?: string | null;
  payment_terms_days?: number;
  is_active?: boolean;
  notes?: string | null;
}

export function createSupplier(payload: SupplierWritePayload): Promise<Supplier> {
  return apiRequest<Supplier>("/suppliers", { method: "POST", body: payload });
}

export function updateSupplier(uuid: string, payload: Partial<SupplierWritePayload>): Promise<Supplier> {
  return apiRequest<Supplier>(`/suppliers/${uuid}`, { method: "PUT", body: payload });
}

export function deleteSupplier(uuid: string): Promise<null> {
  return apiRequest<null>(`/suppliers/${uuid}`, { method: "DELETE" });
}

export interface SupplierProductDetail {
  uuid: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  brand: string | null;
  size: string | null;
  cost_price: number;
  retail_price: number;
  /** Numeric string, e.g. "988.0000" */
  current_stock: string;
  reorder_point: string;
  low_stock: boolean;
  image_url: string | null;
  is_active: boolean;
  category: { id: number; uuid: string; name: string; slug: string } | null;
  unit: { id: number; name: string; abbreviation: string } | null;
  created_at: string;
  updated_at: string;
}

export function getSupplierProducts(uuid: string): Promise<SupplierProductDetail[]> {
  return apiRequest<SupplierProductDetail[]>(`/suppliers/${uuid}/products`);
}

export function addSupplierProduct(
  uuid: string,
  payload: { product_id: string; supplier_price: number; lead_time_days?: number }
): Promise<null> {
  return apiRequest<null>(`/suppliers/${uuid}/products`, { method: "POST", body: payload });
}

export function removeSupplierProduct(uuid: string, productUuid: string): Promise<null> {
  return apiRequest<null>(`/suppliers/${uuid}/products/${productUuid}`, { method: "DELETE" });
}

export interface SupplierPriceHistoryRow {
  product_uuid: string;
  product_name: string;
  product_sku: string;
  unit_price: number;
  quantity_ordered: number;
  order_date: string;
  po_number: string;
}

export function getSupplierPriceHistory(uuid: string): Promise<SupplierPriceHistoryRow[]> {
  return apiRequest<SupplierPriceHistoryRow[]>(`/suppliers/${uuid}/price-history`);
}

/* ---------- Supplier payables (Accounts Payable) ---------- */

export interface SupplierPayableTransaction {
  id: number;
  uuid: string;
  type: "invoice" | "payment" | "adjustment";
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
  purchase_order_id: number | null;
  po_number: string | null;
  purchase_order?: { id: number; uuid: string; po_number: string; order_date: string; total_amount: number; payment_status: string };
  supplier?: { uuid: string; name: string; phone: string | null };
  is_reversed: boolean;
  reversed_at: string | null;
  created_at: string;
}

export interface SupplierPayablesResult {
  items: SupplierPayableTransaction[];
  page: number;
  perPage: number;
  total: number | null;
  lastPage: number | null;
}

export async function getSupplierPayables(
  uuid: string,
  params: { type?: string; page?: number; per_page?: number } = {}
): Promise<SupplierPayablesResult> {
  const res = await apiRequest<{
    data: SupplierPayableTransaction[];
    pagination: { current_page: number; per_page: number; total: number; last_page: number };
  }>(`/suppliers/${uuid}/payables`, { params });
  return {
    items: res.data ?? [],
    page: res.pagination?.current_page ?? params.page ?? 1,
    perPage: res.pagination?.per_page ?? params.per_page ?? 15,
    total: res.pagination?.total ?? null,
    lastPage: res.pagination?.last_page ?? null,
  };
}

export async function getSupplierLedger(
  uuid: string,
  params: { page?: number; per_page?: number } = {}
): Promise<SupplierPayablesResult> {
  const res = await apiRequest<{
    data: SupplierPayableTransaction[];
    pagination: { current_page: number; per_page: number; total: number; last_page: number };
  }>(`/suppliers/${uuid}/ledger`, { params });
  return {
    items: res.data ?? [],
    page: res.pagination?.current_page ?? params.page ?? 1,
    perPage: res.pagination?.per_page ?? params.per_page ?? 15,
    total: res.pagination?.total ?? null,
    lastPage: res.pagination?.last_page ?? null,
  };
}

export interface MakeSupplierPaymentPayload {
  amount: number;
  payment_method: string;
  reference_number?: string;
  invoice_ids?: string[];
  notes?: string;
}

export interface MakeSupplierPaymentResult {
  transaction: SupplierPayableTransaction;
  applied_to: {
    po_uuid: string;
    po_number: string;
    amount_applied: number;
    previous_balance: number;
    new_balance: number;
    status: string;
  }[];
  remaining_credit: number;
}

export function makeSupplierPayment(uuid: string, payload: MakeSupplierPaymentPayload): Promise<MakeSupplierPaymentResult> {
  return apiRequest<MakeSupplierPaymentResult>(`/suppliers/${uuid}/payments`, { method: "POST", body: payload });
}

export interface SupplierStatement {
  supplier: {
    uuid: string;
    code: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    payment_terms_days: number;
  };
  period: { from: string; to: string };
  opening_balance: number;
  transactions: {
    date: string;
    type: string;
    description: string;
    reference: string;
    po_number: string | null;
    due_date: string | null;
    invoices: number;
    payments: number;
    balance: number;
  }[];
  closing_balance: number;
  summary: { total_invoices: number; total_payments: number; net_change: number };
}

export function getSupplierStatement(uuid: string, startDate: string, endDate: string): Promise<SupplierStatement> {
  return apiRequest<SupplierStatement>(`/suppliers/${uuid}/statement`, {
    params: { start_date: startDate, end_date: endDate },
  });
}

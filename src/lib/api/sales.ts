import { apiRequest } from "./client";

export type SaleStatus = "completed" | "voided" | "refunded";
export type SalePaymentMethod = "cash" | "gcash" | "maya" | "bank_transfer" | "check" | "credit";

export interface SaleCustomerRef {
  uuid: string;
  name: string;
  email: string | null;
  phone: string | null;
  customer_type: string | null;
}

export interface SaleItem {
  id: number;
  product: { uuid: string; name: string; sku: string; unit_of_measure: string };
  quantity: number;
  unit_price: string;
  discount_type: string | null;
  discount_value: string | null;
  discount_amount: string;
  line_total: string;
  is_refund: boolean;
  parent_sale_item_id: number | null;
}

export interface SalePayment {
  id: number;
  method: SalePaymentMethod;
  amount: string;
  reference_number: string | null;
  created_at: string;
}

export interface Sale {
  uuid: string;
  sale_number: string;
  sale_date: string;
  status: SaleStatus;
  price_tier: string;
  subtotal: string;
  discount_type: string | null;
  discount_value: string | null;
  discount_amount: string;
  vat_amount: string;
  total_amount: string;
  notes: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
  updated_at: string;
  customer: SaleCustomerRef | null;
  items: SaleItem[];
  payments: SalePayment[];
  user: { uuid: string; name: string; email: string; role: string };
  branch: { uuid: string; name: string; code: string | null };
  voided_by_user: { uuid: string; name: string } | null;
}

export interface ListSalesParams {
  page?: number;
  per_page?: number;
  status?: SaleStatus;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

export interface ListSalesResult {
  items: Sale[];
  page: number;
  perPage: number;
  total: number | null;
  lastPage: number | null;
}

/** The sales list endpoint nests a Laravel paginator inside `data` (data.data/links/meta). */
export async function listSales(params: ListSalesParams): Promise<ListSalesResult> {
  const paginator = await apiRequest<{
    data: Sale[];
    links: { first: string | null; last: string | null; prev: string | null; next: string | null };
    meta: { current_page: number; from: number | null; last_page: number; per_page: number; to: number | null; total: number };
  }>("/sales", {
    params: {
      page: params.page,
      per_page: params.per_page,
      status: params.status,
      customer_id: params.customer_id,
      date_from: params.date_from,
      date_to: params.date_to,
      search: params.search,
    },
  });
  return {
    items: paginator.data ?? [],
    page: paginator.meta?.current_page ?? params.page ?? 1,
    perPage: paginator.meta?.per_page ?? params.per_page ?? 15,
    total: paginator.meta?.total ?? null,
    lastPage: paginator.meta?.last_page ?? null,
  };
}

export type PriceTier = "retail" | "wholesale" | "bulk";

/** The API takes and computes all money as integer centavos */
export interface SaleItemInput {
  product_id: string;
  quantity: number;
  /** Integer centavos */
  unit_price: number;
  discount_type?: "percentage" | "fixed";
  /** Percent, or pesos when fixed */
  discount_value?: number;
}

export interface SalePaymentInput {
  method: SalePaymentMethod;
  /** Integer centavos; the sum must equal the server-computed total (±1 centavo) */
  amount: number;
  reference_number?: string;
}

export interface CreateSalePayload {
  customer_id?: string;
  price_tier: PriceTier;
  items: SaleItemInput[];
  discount_type?: "percentage" | "fixed";
  discount_value?: number;
  payments: SalePaymentInput[];
  notes?: string;
}

export function createSale(payload: CreateSalePayload): Promise<Sale> {
  return apiRequest<Sale>("/sales", { method: "POST", body: payload });
}

export function getSale(uuid: string): Promise<Sale> {
  return apiRequest<Sale>(`/sales/${uuid}`);
}

export function voidSale(uuid: string, reason: string): Promise<Sale> {
  return apiRequest<Sale>(`/sales/${uuid}/void`, { method: "POST", body: { reason } });
}

export interface RefundItemInput {
  sale_item_id: number;
  quantity: number;
}

export function refundSale(uuid: string, items: RefundItemInput[], reason: string): Promise<Sale> {
  return apiRequest<Sale>(`/sales/${uuid}/refund`, { method: "POST", body: { items, reason } });
}

export interface SaleReceipt {
  store: { name: string; address: string; phone: string; email: string; tin: string; bir_permit: string; website: string };
  sale: { sale_number: string; date: string; cashier: string; branch: string };
  customer: { name: string; phone: string; email: string; address: string } | null;
  items: { name: string; sku: string; quantity: string; unit_of_measure: string; unit_price: string; discount: string | null; line_total: string }[];
  totals: { subtotal: string; discount: string | null; vat_rate: string; vat_type: string; vat_amount: string; vat_sales: string; total: string };
  payments: { method: string; amount: string; reference: string | null }[];
  change: string;
  notes: string | null;
  footer: { message: string; terms: string; powered_by: string };
  is_reprint: boolean;
  printed_at: string;
}

export function getSaleReceipt(uuid: string): Promise<SaleReceipt> {
  return apiRequest<SaleReceipt>(`/sales/${uuid}/receipt`);
}

export function sendSaleReceipt(uuid: string, method: "email" | "sms", recipient: string): Promise<null> {
  return apiRequest<null>(`/sales/${uuid}/receipt/send`, { method: "POST", body: { method, recipient } });
}

export interface HeldTransaction {
  id: number;
  name: string;
  created_at: string;
  expires_at: string;
  created_by: string;
}

/** Stored verbatim by the API and returned as-is on resume */
export interface HeldCartData {
  customer_id: string | null;
  price_tier: PriceTier;
  items: { product_id: string; quantity: number; unit_price: number }[];
  notes?: string | null;
}

export function holdSale(name: string, cartData: HeldCartData): Promise<{ id: number; name: string; expires_at: string }> {
  return apiRequest("/sales/hold", { method: "POST", body: { name, cart_data: cartData } });
}

export function listHeldSales(): Promise<HeldTransaction[]> {
  return apiRequest<HeldTransaction[]>("/sales/held/list");
}

/** Resuming also deletes the held transaction server-side — no separate discard needed */
export function resumeHeldSale(id: number): Promise<HeldCartData> {
  return apiRequest<HeldCartData>(`/sales/held/${id}/resume`);
}

export function discardHeldSale(id: number): Promise<null> {
  return apiRequest<null>(`/sales/held/${id}`, { method: "DELETE" });
}

export function previewNextSaleNumber(): Promise<{ sale_number: string }> {
  return apiRequest("/sales/next-number/preview");
}

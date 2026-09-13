import { apiRequest, apiRequestEnvelope } from "./client";

export type PurchaseOrderStatus = "draft" | "submitted" | "partial" | "received" | "cancelled";

export interface PurchaseOrderSupplierRef {
  uuid: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  payment_terms_days: number;
}

export interface PurchaseOrderItem {
  id: number;
  product: { uuid: string; name: string; sku: string; unit: { name: string; abbreviation: string } | null };
  quantity_ordered: number;
  quantity_received: number;
  quantity_remaining: number;
  unit_cost: number;
  line_total: number;
  status: string;
  notes: string | null;
}

export interface PurchaseOrder {
  uuid: string;
  po_number: string;
  status: PurchaseOrderStatus;
  order_date: string;
  expected_delivery_date: string | null;
  received_date: string | null;
  total_amount: number;
  notes: string | null;
  /** Not included by the list/detail endpoints on all backend versions; may be absent. */
  supplier?: PurchaseOrderSupplierRef;
  items?: PurchaseOrderItem[];
  user?: { id: number; name: string; email: string };
  branch?: { id: number; name: string };
  created_at: string;
  updated_at: string;
}

export interface ListPurchaseOrdersParams {
  page?: number;
  per_page?: number;
  status?: PurchaseOrderStatus;
  supplier_id?: string;
}

export interface ListPurchaseOrdersResult {
  items: PurchaseOrder[];
  page: number;
  perPage: number;
  total: number | null;
  lastPage: number | null;
}

export async function listPurchaseOrders(params: ListPurchaseOrdersParams = {}): Promise<ListPurchaseOrdersResult> {
  const envelope = await apiRequestEnvelope<PurchaseOrder[]>("/purchase-orders", {
    params: {
      page: params.page,
      per_page: params.per_page,
      status: params.status,
      supplier_id: params.supplier_id,
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

export function getPurchaseOrder(uuid: string): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>(`/purchase-orders/${uuid}`);
}

export interface PurchaseOrderItemInput {
  product_id: string;
  quantity: number;
  /** Integer centavos — the API validates unit_cost as an integer and divides by 100 */
  unit_cost: number;
}

export interface CreatePurchaseOrderPayload {
  supplier_id: string;
  expected_delivery_date?: string;
  items: PurchaseOrderItemInput[];
  notes?: string;
}

export function createPurchaseOrder(payload: CreatePurchaseOrderPayload): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>("/purchase-orders", { method: "POST", body: payload });
}

export function updatePurchaseOrder(
  uuid: string,
  payload: { expected_delivery_date?: string; notes?: string }
): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>(`/purchase-orders/${uuid}`, { method: "PUT", body: payload });
}

export function deletePurchaseOrder(uuid: string): Promise<null> {
  return apiRequest<null>(`/purchase-orders/${uuid}`, { method: "DELETE" });
}

export function submitPurchaseOrder(uuid: string): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>(`/purchase-orders/${uuid}/submit`, { method: "POST" });
}

export interface ReceivePurchaseOrderItemInput {
  purchase_order_item_id: number;
  quantity_received: number;
}

export function receivePurchaseOrder(
  uuid: string,
  payload: { received_date?: string; notes?: string; items?: ReceivePurchaseOrderItemInput[] } = {}
): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>(`/purchase-orders/${uuid}/receive`, { method: "POST", body: payload });
}

export function cancelPurchaseOrder(uuid: string, reason: string): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>(`/purchase-orders/${uuid}/cancel`, { method: "POST", body: { reason } });
}

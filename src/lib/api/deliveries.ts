import { apiRequest, apiRequestEnvelope } from "./client";

export type DeliveryStatus = "preparing" | "dispatched" | "in_transit" | "delivered" | "failed";

export interface DeliverySaleRef {
  uuid: string;
  sale_number: string;
  total_amount: number;
  payment_status: string;
  status: string;
  sale_date: string;
}

export interface DeliveryCustomerRef {
  uuid: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export interface DeliveryDriverRef {
  id: number;
  name: string;
  email: string;
  phone: string | null;
}

export interface DeliveryItem {
  id: number;
  sale_item_id: number | null;
  quantity: number;
  status: string;
  notes: string | null;
  product: { uuid: string; name: string; sku: string; description: string | null };
  unit: { name: string; abbreviation: string } | null;
  sale_item?: { id: number; product_name: string; product_sku: string; quantity: number; unit_price: number; line_total: number };
}

export interface Delivery {
  uuid: string;
  delivery_number: string;
  status: DeliveryStatus;
  scheduled_date: string;
  delivery_address: string;
  delivery_city: string | null;
  delivery_province: string | null;
  delivery_postal_code: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  delivery_instructions: string | null;
  dispatched_at: string | null;
  delivered_at: string | null;
  failed_at: string | null;
  failed_reason: string | null;
  proof_of_delivery_path: string | null;
  proof_of_delivery_url: string | null;
  signature_path: string | null;
  signature_url: string | null;
  received_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  /** Not included by the list/detail endpoints on all backend versions; may be absent. */
  sale?: DeliverySaleRef | null;
  customer?: DeliveryCustomerRef | null;
  driver?: DeliveryDriverRef | null;
  items?: DeliveryItem[];
}

export function getTodaySchedule(): Promise<Delivery[]> {
  return apiRequest<Delivery[]>("/deliveries/today-schedule");
}

export interface ListDeliveriesParams {
  page?: number;
  per_page?: number;
  status?: DeliveryStatus;
  date_from?: string;
  date_to?: string;
}

export interface ListDeliveriesResult {
  items: Delivery[];
  page: number;
  perPage: number;
  total: number | null;
  lastPage: number | null;
}

export async function listDeliveries(params: ListDeliveriesParams = {}): Promise<ListDeliveriesResult> {
  const envelope = await apiRequestEnvelope<Delivery[]>("/deliveries", {
    params: {
      page: params.page,
      per_page: params.per_page,
      status: params.status,
      date_from: params.date_from,
      date_to: params.date_to,
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

export function getDelivery(uuid: string): Promise<Delivery> {
  return apiRequest<Delivery>(`/deliveries/${uuid}`);
}

export interface DeliveryItemInput {
  sale_item_id: number;
  quantity: number;
}

export interface CreateDeliveryPayload {
  customer_id: string;
  sale_id: string;
  scheduled_date: string;
  delivery_address: string;
  items: DeliveryItemInput[];
  notes?: string;
}

export function createDelivery(payload: CreateDeliveryPayload): Promise<Delivery> {
  return apiRequest<Delivery>("/deliveries", { method: "POST", body: payload });
}

export function updateDelivery(
  uuid: string,
  payload: { scheduled_date?: string; delivery_address?: string; notes?: string }
): Promise<Delivery> {
  return apiRequest<Delivery>(`/deliveries/${uuid}`, { method: "PUT", body: payload });
}

export function deleteDelivery(uuid: string): Promise<null> {
  return apiRequest<null>(`/deliveries/${uuid}`, { method: "DELETE" });
}

export function updateDeliveryStatus(uuid: string, status: DeliveryStatus, notes?: string): Promise<Delivery> {
  return apiRequest<Delivery>(`/deliveries/${uuid}/status`, { method: "PUT", body: { status, notes } });
}

export function assignDriver(uuid: string, driverId: string): Promise<Delivery> {
  return apiRequest<Delivery>(`/deliveries/${uuid}/assign-driver`, { method: "POST", body: { driver_id: driverId } });
}

export interface DeliveryReceipt {
  store: { name: string; address: string; phone: string; email: string };
  delivery: {
    number: string;
    status: string;
    scheduled_date: string;
    scheduled_time: string | null;
    dispatched_at: string | null;
    delivered_at: string | null;
    created_at: string;
  };
  customer: { name: string; phone: string | null; email: string | null };
  delivery_address: {
    street: string;
    city: string | null;
    province: string | null;
    postal_code: string | null;
    contact_person: string | null;
    contact_phone: string | null;
  };
  sale: { number: string; date: string; total_amount: string } | null;
  items: { product_name: string; quantity: number; unit: string | null; status: string }[];
  instructions: string | null;
  driver: { name: string; phone: string | null } | null;
  received_by: string | null;
  proof_url: string | null;
  signature_url: string | null;
}

export function getDeliveryReceipt(uuid: string): Promise<DeliveryReceipt> {
  return apiRequest<DeliveryReceipt>(`/deliveries/${uuid}/receipt`);
}

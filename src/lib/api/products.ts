import { apiRequest, apiRequestEnvelope } from "./client";

export interface ProductCategory {
  id: number;
  uuid: string;
  name: string;
  slug: string;
}

export interface ProductUnit {
  id: number;
  name: string;
  abbreviation: string;
}

/** Shape returned by the products list endpoint. */
export interface ProductListItem {
  uuid: string;
  name: string;
  sku: string;
  barcode: string | null;
  description: string | null;
  brand: string | null;
  size: string | null;
  material: string | null;
  color: string | null;
  cost_price: number;
  retail_price: number;
  wholesale_price: number;
  bulk_price: number;
  /** Numeric strings, e.g. "386.0000" */
  current_stock: string;
  reorder_point: string;
  minimum_order_qty: string;
  low_stock: boolean;
  image_url: string | null;
  is_active: boolean;
  is_vat_exempt: boolean;
  track_inventory: boolean;
  allow_negative_stock: boolean;
  category: ProductCategory | null;
  created_at: string;
  updated_at: string;
}

/** Shape returned by update / get-by-barcode: list item plus nested unit. */
export interface ProductDetail extends ProductListItem {
  unit: ProductUnit | null;
}

/** Lean shape returned by the POS search endpoint. */
export interface ProductSearchResult {
  uuid: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  stock: string;
  image_url: string | null;
}

export interface ListProductsParams {
  page?: number;
  per_page?: number;
  q?: string;
  /** Category uuid. Unknown uuids match nothing rather than falling back to unfiltered. */
  categoryUuid?: string;
  is_active?: boolean;
  low_stock?: boolean;
  sort_by?: "name" | "sku" | "retail_price" | "current_stock" | "created_at";
  sort_order?: "asc" | "desc";
}

export interface ListProductsResult {
  items: ProductListItem[];
  page: number;
  perPage: number;
  total: number | null;
  lastPage: number | null;
}

export async function listProducts(params: ListProductsParams): Promise<ListProductsResult> {
  const envelope = await apiRequestEnvelope<ProductListItem[]>("/products", {
    params: {
      page: params.page,
      per_page: params.per_page,
      q: params.q,
      category_uuid: params.categoryUuid,
      is_active: params.is_active === undefined ? undefined : params.is_active ? 1 : 0,
      low_stock: params.low_stock ? 1 : undefined,
      sort_by: params.sort_by,
      sort_order: params.sort_order,
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

export function searchProducts(q: string): Promise<ProductSearchResult[]> {
  return apiRequest<ProductSearchResult[]>("/products/search", { params: { q } });
}

export function getProductByBarcode(barcode: string): Promise<ProductDetail> {
  return apiRequest<ProductDetail>(`/products/barcode/${encodeURIComponent(barcode)}`);
}

export function getProductByUuid(uuid: string): Promise<ProductDetail> {
  return apiRequest<ProductDetail>(`/products/${uuid}`);
}

export interface ProductWritePayload {
  name: string;
  sku: string;
  barcode?: string | null;
  description?: string | null;
  brand?: string | null;
  size?: string | null;
  material?: string | null;
  color?: string | null;
  category_id?: number | null;
  unit_id?: string | null;
  cost_price: number;
  retail_price: number;
  wholesale_price?: number;
  bulk_price?: number;
  reorder_point?: number;
  minimum_order_qty?: number;
  image_url?: string | null;
  is_active?: boolean;
  is_vat_exempt?: boolean;
  track_inventory?: boolean;
  allow_negative_stock?: boolean;
}

export function createProduct(payload: ProductWritePayload): Promise<ProductDetail> {
  return apiRequest<ProductDetail>("/products", { method: "POST", body: payload });
}

export function updateProduct(uuid: string, payload: ProductWritePayload): Promise<ProductDetail> {
  return apiRequest<ProductDetail>(`/products/${uuid}`, { method: "PUT", body: payload });
}

export function deleteProduct(uuid: string): Promise<null> {
  return apiRequest<null>(`/products/${uuid}`, { method: "DELETE" });
}

export type StockAdjustmentType = "add" | "subtract" | "set";

export interface AdjustStockResult {
  product: ProductDetail;
  previous_stock: number;
  new_stock: number;
  adjustment: number;
  type: StockAdjustmentType;
}

export function adjustProductStock(
  uuid: string,
  input: { quantity: number; adjustment_type: StockAdjustmentType; reason: string; notes?: string }
): Promise<AdjustStockResult> {
  return apiRequest<AdjustStockResult>(`/products/${uuid}/adjust-stock`, { method: "POST", body: input });
}

export interface StockHistoryEntry {
  uuid: string;
  type: string;
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  reason: string;
  notes: string | null;
  reference_type: string | null;
  reference_id: number | null;
  branch?: { id: number; name: string } | null;
  user?: { id: number; name: string; email: string } | null;
  created_at: string;
  updated_at: string;
}

export function getProductStockHistory(
  uuid: string
): Promise<{ product: { uuid: string; name: string; sku: string; current_stock: number }; history: StockHistoryEntry[]; total_records: number }> {
  return apiRequest(`/products/${uuid}/stock-history`);
}

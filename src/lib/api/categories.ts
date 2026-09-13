import { apiRequest, apiRequestEnvelope } from "./client";

export interface Category {
  /** Numeric primary key. Products are filtered/assigned by this, not by uuid. */
  id: number;
  uuid: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  products_count: number | null;
  created_at: string;
  updated_at: string;
}

export interface ListCategoriesParams {
  page?: number;
  per_page?: number;
}

export interface ListCategoriesResult {
  items: Category[];
  page: number;
  perPage: number;
  total: number | null;
  lastPage: number | null;
}

export async function listCategories(params: ListCategoriesParams = {}): Promise<ListCategoriesResult> {
  const envelope = await apiRequestEnvelope<Category[]>("/categories", {
    params: { page: params.page, per_page: params.per_page ?? 100 },
  });
  return {
    items: envelope.data ?? [],
    page: envelope.meta?.current_page ?? params.page ?? 1,
    perPage: envelope.meta?.per_page ?? params.per_page ?? 100,
    total: envelope.meta?.total ?? null,
    lastPage: envelope.meta?.last_page ?? null,
  };
}

export function getCategory(uuid: string): Promise<Category> {
  return apiRequest<Category>(`/categories/${uuid}`);
}

export interface CategoryWritePayload {
  name: string;
  slug?: string;
  description?: string | null;
  is_active?: boolean;
  sort_order?: number;
}

export function createCategory(payload: CategoryWritePayload): Promise<Category> {
  return apiRequest<Category>("/categories", { method: "POST", body: payload });
}

export function updateCategory(uuid: string, payload: Partial<CategoryWritePayload>): Promise<Category> {
  return apiRequest<Category>(`/categories/${uuid}`, { method: "PUT", body: payload });
}

export function deleteCategory(uuid: string): Promise<null> {
  return apiRequest<null>(`/categories/${uuid}`, { method: "DELETE" });
}

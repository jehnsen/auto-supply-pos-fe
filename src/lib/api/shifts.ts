import { apiRequest, apiRequestEnvelope, type ApiEnvelope } from "./client";

/**
 * Shifts = cash-drawer sessions. Opening a shift starts the session; closing it
 * generates the Z-reading. Money fields come back from the API as decimal
 * *strings* (e.g. "5000.00"); the open/close request bodies expect integer
 * *centavos* (e.g. ₱5,000.00 → 500000). Use `toCentavos` / `parseMoney` below.
 */

export type ShiftStatus = "open" | "closed";

export interface ShiftUser {
  uuid: string;
  name: string;
  email: string;
}

export interface ShiftBranch {
  uuid: string;
  name: string;
  code: string;
}

export interface ShiftPaymentMethodBreakdown {
  method: string;
  transaction_count: number;
  total_amount: string;
}

export interface ShiftSalesSummary {
  transaction_count: number;
  completed_count: number;
  voided_count: number;
  refunded_count: number;
  gross_sales: string;
  total_discounts: string;
  total_vat: string;
  cash_sales_total: string;
  payment_methods: ShiftPaymentMethodBreakdown[];
}

export interface Shift {
  uuid: string;
  shift_number: string;
  status: ShiftStatus;
  opening_cash: string;
  closing_cash: string | null;
  expected_cash: string | null;
  cash_variance: string | null;
  sales_summary: ShiftSalesSummary | null;
  opening_notes: string | null;
  closing_notes: string | null;
  opened_at: string;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
  user?: ShiftUser | null;
  branch?: ShiftBranch | null;
}

export interface XReading {
  shift: Shift;
  reading: ShiftSalesSummary;
}

export interface ShiftHistoryFilters {
  page?: number;
  per_page?: number;
  status?: ShiftStatus;
  branch_id?: number | string;
  user_id?: number | string;
  date_from?: string;
  date_to?: string;
}

/** Parse an API money string ("5000.00") into a number. `null` → 0. */
export function parseMoney(value: string | null): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Convert a peso amount to the integer centavos the open/close endpoints expect. */
export function toCentavos(pesos: number): number {
  return Math.round(pesos * 100);
}

/** Current open shift for the authenticated user, or `null` if none is open. */
export async function getCurrentShift(): Promise<Shift | null> {
  try {
    return await apiRequest<Shift>("/shifts/current");
  } catch {
    // 404 (no open shift) is an expected, non-exceptional state.
    return null;
  }
}

export function getShift(uuid: string): Promise<Shift> {
  return apiRequest<Shift>(`/shifts/${uuid}`);
}

export function getXReading(uuid: string): Promise<XReading> {
  return apiRequest<XReading>(`/shifts/${uuid}/x-reading`);
}

export function openShift(openingCashPesos: number, notes?: string): Promise<Shift> {
  return apiRequest<Shift>("/shifts/open", {
    method: "POST",
    body: { opening_cash: toCentavos(openingCashPesos), notes: notes || undefined },
  });
}

export function closeShift(uuid: string, closingCashPesos: number, notes?: string): Promise<Shift> {
  return apiRequest<Shift>(`/shifts/${uuid}/close`, {
    method: "POST",
    body: { closing_cash: toCentavos(closingCashPesos), notes: notes || undefined },
  });
}

export function listShifts(filters: ShiftHistoryFilters = {}): Promise<ApiEnvelope<Shift[]>> {
  return apiRequestEnvelope<Shift[]>("/shifts", {
    params: {
      page: filters.page ?? 1,
      per_page: filters.per_page ?? 15,
      status: filters.status,
      branch_id: filters.branch_id,
      user_id: filters.user_id,
      date_from: filters.date_from,
      date_to: filters.date_to,
    },
  });
}

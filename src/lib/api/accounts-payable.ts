import { apiRequest } from "./client";

export interface APOverview {
  total_suppliers: number;
  suppliers_with_balance: number;
  total_outstanding: number;
  total_purchases: number;
  average_payment_terms: number;
}

export function getAPOverview(): Promise<APOverview> {
  return apiRequest<APOverview>("/ap/overview");
}

export interface APAgingSupplierRow {
  supplier: {
    uuid: string;
    code: string;
    name: string;
    company_name: string | null;
    phone: string | null;
    email: string | null;
    payment_terms_days: number;
    total_outstanding: number;
  };
  aging: { current: number; days_31_60: number; days_61_90: number; days_over_90: number };
  total_outstanding: number;
  oldest_invoice_days: number;
}

export interface APAgingReport {
  suppliers: APAgingSupplierRow[];
  summary: { current: number; days_31_60: number; days_61_90: number; days_over_90: number; total_outstanding: number };
  supplier_count: number;
}

export function getAPAging(): Promise<APAgingReport> {
  return apiRequest<APAgingReport>("/ap/aging");
}

export interface OverduePayableAccount {
  supplier: { uuid: string; code: string; name: string; phone: string | null; email: string | null };
  overdue_amount: number;
  days_overdue: number;
  oldest_due_date: string;
  invoice_count: number;
}

export function getOverduePayables(): Promise<{ accounts: OverduePayableAccount[]; total_overdue: number; account_count: number }> {
  return apiRequest("/ap/overdue");
}

export interface PaymentScheduleRow {
  supplier: { uuid: string; code: string; name: string };
  purchase_order: { uuid: string; po_number: string; order_date: string };
  due_date: string;
  days_until_due: number;
  amount_due: number;
  payment_status: string;
}

export function getPaymentSchedule(days = 30): Promise<{ schedule: PaymentScheduleRow[]; total_due: number; count: number }> {
  return apiRequest("/ap/payment-schedule", { params: { days } });
}

export interface DisbursementReport {
  summary: { total_disbursed: number; total_payments: number };
  by_method: { payment_method: string; payment_count: number; total_disbursed: number }[];
  daily_disbursements: { date: string; payment_method: string; payment_count: number; total_disbursed: number }[];
}

export function getDisbursementReport(startDate: string, endDate: string): Promise<DisbursementReport> {
  return apiRequest<DisbursementReport>("/ap/disbursement-report", { params: { start_date: startDate, end_date: endDate } });
}

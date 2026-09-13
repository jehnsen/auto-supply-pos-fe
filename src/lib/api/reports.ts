import { apiRequest } from "./client";

/* ---------- Sales reports ---------- */

export interface DailySalesReport {
  date: string;
  summary: { transaction_count: number; total_sales: number; total_discounts: number; average_transaction: number };
  hourly_breakdown: { hour: number; transaction_count: number; total_sales: number }[];
  payment_methods: { method: string; count: number; total: number }[];
  top_products: { product_uuid: string; product_name: string; product_sku: string; quantity_sold: number; revenue: number }[];
}

export function getDailySalesReport(date: string): Promise<DailySalesReport> {
  return apiRequest<DailySalesReport>("/reports/sales/daily", { params: { date } });
}

export interface SalesSummaryReport {
  period: { start_date: string; end_date: string; group_by: string };
  summary: { total_transactions: number; total_sales: number; total_discounts: number; average_transaction: number };
  data: { period: string; transaction_count: number; total_sales: number; total_discounts: number; average_transaction: number }[];
}

export function getSalesSummaryReport(
  startDate: string,
  endDate: string,
  groupBy: "day" | "week" | "month" = "day"
): Promise<SalesSummaryReport> {
  return apiRequest<SalesSummaryReport>("/reports/sales/summary", {
    params: { start_date: startDate, end_date: endDate, group_by: groupBy },
  });
}

export interface SalesByCategoryReport {
  period: { start_date: string; end_date: string };
  total_sales: number;
  data: { category_name: string; total_quantity: number; total_sales: number; transaction_count: number; percentage: number }[];
}

export function getSalesByCategoryReport(startDate: string, endDate: string): Promise<SalesByCategoryReport> {
  return apiRequest<SalesByCategoryReport>("/reports/sales/by-category", { params: { start_date: startDate, end_date: endDate } });
}

export interface SalesByCustomerReport {
  period: { start_date: string; end_date: string };
  data: {
    customer: { uuid: string; code: string; name: string; email: string | null; phone: string | null };
    transaction_count: number;
    total_purchases: number;
    average_order_value: number;
    last_purchase_date: string;
  }[];
}

export function getSalesByCustomerReport(startDate: string, endDate: string, limit = 20): Promise<SalesByCustomerReport> {
  return apiRequest<SalesByCustomerReport>("/reports/sales/by-customer", {
    params: { start_date: startDate, end_date: endDate, limit },
  });
}

export interface SalesByPaymentMethodReport {
  period: { start_date: string; end_date: string };
  total_amount: number;
  data: { method: string; transaction_count: number; total_amount: number; percentage: number }[];
}

export function getSalesByPaymentMethodReport(startDate: string, endDate: string): Promise<SalesByPaymentMethodReport> {
  return apiRequest<SalesByPaymentMethodReport>("/reports/sales/by-payment-method", {
    params: { start_date: startDate, end_date: endDate },
  });
}

export interface SalesByCashierReport {
  period: { start_date: string; end_date: string };
  data: { cashier_name: string; transaction_count: number; total_sales: number; average_transaction: number }[];
}

export function getSalesByCashierReport(startDate: string, endDate: string): Promise<SalesByCashierReport> {
  return apiRequest<SalesByCashierReport>("/reports/sales/by-cashier", { params: { start_date: startDate, end_date: endDate } });
}

/* ---------- Inventory reports ---------- */

export interface InventoryValuationReport {
  summary: { total_products: number; total_units: number; total_value: number };
  data: { category_id: number | null; category_name: string; product_count: number; total_units: number; total_value: number }[];
}

export function getInventoryValuationReport(): Promise<InventoryValuationReport> {
  return apiRequest<InventoryValuationReport>("/reports/inventory/valuation");
}

export interface StockMovementRow {
  id: number;
  uuid: string;
  date: string;
  product: { id: number; name: string; sku: string } | null;
  branch: { id: number; name: string };
  type: string;
  quantity_before: number;
  quantity_change: number;
  quantity_after: number;
  reason: string | null;
  notes: string | null;
  user: { id: number; name: string };
}

export interface StockMovementReport {
  period: { start_date: string; end_date: string };
  product_id: string | null;
  data: StockMovementRow[];
}

export function getStockMovementReport(startDate: string, endDate: string, productId?: string): Promise<StockMovementReport> {
  return apiRequest<StockMovementReport>("/reports/inventory/movement", {
    params: { start_date: startDate, end_date: endDate, product_id: productId },
  });
}

export interface LowStockReportRow {
  uuid: string;
  sku: string;
  name: string;
  category: string;
  current_stock: number;
  reorder_point: number;
  minimum_order_qty: number;
  unit: string;
  stock_percentage: number;
  estimated_days_until_stockout: number | null;
  urgency: "low" | "medium" | "high";
}

export function getLowStockReport(): Promise<{ count: number; data: LowStockReportRow[] }> {
  return apiRequest("/reports/inventory/low-stock");
}

export interface DeadStockReportRow {
  uuid: string;
  sku: string;
  name: string;
  category: string;
  current_stock: number;
  cost_price: number;
  stock_value: number;
  days_since_last_sale: number;
  last_sale_date: string;
}

export function getDeadStockReport(days = 90): Promise<{ period_days: number; count: number; total_stock_value: number; data: DeadStockReportRow[] }> {
  return apiRequest("/reports/inventory/dead-stock", { params: { days } });
}

export interface ProductProfitabilityReport {
  period: { start_date: string; end_date: string };
  summary: { total_revenue: number; total_cost: number; total_profit: number };
  data: {
    product_uuid: string;
    product_sku: string;
    product_name: string;
    quantity_sold: number;
    total_revenue: number;
    total_cost: number;
    gross_profit: number;
    margin_percentage: number;
  }[];
}

export function getProductProfitabilityReport(startDate: string, endDate: string, limit = 20): Promise<ProductProfitabilityReport> {
  return apiRequest<ProductProfitabilityReport>("/reports/inventory/profitability", {
    params: { start_date: startDate, end_date: endDate, limit },
  });
}

/* ---------- Credit reports ---------- */

export interface CreditAgingCustomerRow {
  uuid: string;
  code: string;
  name: string;
  type: string;
  email: string | null;
  phone: string | null;
  credit_limit: number;
  total_outstanding: number;
  aging_current: number;
  aging_31_60: number;
  aging_61_90: number;
  aging_over_90: number;
  oldest_invoice_days: number;
}

export interface CreditReportAgingReport {
  customers: CreditAgingCustomerRow[];
  summary: { current: number; days_31_60: number; days_61_90: number; days_over_90: number; total_outstanding: number };
  customer_count: number;
}

export function getCreditReportAging(): Promise<CreditReportAgingReport> {
  return apiRequest<CreditReportAgingReport>("/reports/credit/aging");
}

export interface CreditCollectionReport {
  period: { start_date: string; end_date: string };
  summary: { total_collected: number; total_payments: number };
  by_method: { payment_method: string; payment_count: number; total_collected: number }[];
  daily_collections: { date: string; payment_method: string; payment_count: number; total_collected: number }[];
}

export function getCreditCollectionReport(startDate: string, endDate: string): Promise<CreditCollectionReport> {
  return apiRequest<CreditCollectionReport>("/reports/credit/collection", { params: { start_date: startDate, end_date: endDate } });
}

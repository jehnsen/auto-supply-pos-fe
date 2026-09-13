import { apiRequest } from "./client";
import type { ProductListItem } from "./products";

export interface DashboardSummary {
  today_sales: { amount: number; amount_pesos: number; transaction_count: number };
  low_stock_count: number;
  outstanding_credit: { amount: number; amount_pesos: number };
  pending_deliveries: number;
}

export interface SalesTrendPoint {
  date: string;
  total: number;
  total_pesos: number;
  transactions: number;
}

export interface TopProduct {
  uuid: string;
  name: string;
  sku: string;
  total_quantity: number;
  total_revenue: number;
  total_revenue_pesos: number;
}

export interface SalesByCategoryRow {
  name: string;
  slug: string;
  total: number;
  total_pesos: number;
  percentage?: number;
}

export interface RecentTransaction {
  uuid: string;
  sale_number: string;
  sale_date: string;
  status: string;
  subtotal: string;
  total_amount: string;
  customer: { uuid: string | null; name: string; email: string | null; phone: string | null } | null;
  user: { uuid: string | null; name: string };
  branch: { uuid: string | null; name: string };
}

export interface TopCustomer {
  uuid: string;
  name: string;
  type: string;
  transaction_count: number;
  total_purchases: number;
  total_purchases_pesos: number;
}

export interface ComprehensiveDashboard {
  summary: DashboardSummary;
  sales_trend: SalesTrendPoint[];
  top_products: TopProduct[];
  sales_by_category: SalesByCategoryRow[];
  recent_transactions: RecentTransaction[];
  stock_alerts_count: number;
  upcoming_deliveries_count: number;
  top_customers: TopCustomer[];
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  return apiRequest<DashboardSummary>("/dashboard/summary");
}

export function getSalesTrend(days = 30): Promise<{ period: string; data: SalesTrendPoint[] }> {
  return apiRequest("/dashboard/sales-trend", { params: { days } });
}

export function getTopProducts(limit = 10): Promise<{ period: string; data: TopProduct[] }> {
  return apiRequest("/dashboard/top-products", { params: { limit } });
}

export function getStockAlerts(): Promise<{ count: number; data: ProductListItem[] }> {
  return apiRequest("/dashboard/stock-alerts");
}

export function getComprehensiveDashboard(): Promise<ComprehensiveDashboard> {
  return apiRequest<ComprehensiveDashboard>("/dashboard/comprehensive");
}

"use client";

import type {
  InventoryValuationReport,
  LowStockReportRow,
  ProductProfitabilityReport,
  SalesByCategoryReport,
  SalesByPaymentMethodReport,
  SalesSummaryReport,
  StockMovementReport,
} from "@/lib/api/reports";
import type { StoreProfile } from "@/lib/api/settings";
import { formatDate, toNum } from "@/lib/utils";

export default function MonthlyReportPrint({
  monthLabel,
  store,
  summary,
  category,
  payment,
  products,
  valuation,
  lowStock,
  movement,
  money,
}: {
  monthLabel: string;
  store: StoreProfile["store"] | null;
  summary: SalesSummaryReport;
  category: SalesByCategoryReport;
  payment: SalesByPaymentMethodReport;
  products: ProductProfitabilityReport;
  valuation: InventoryValuationReport;
  lowStock: { count: number; data: LowStockReportRow[] };
  movement: StockMovementReport;
  money: (n: number) => string;
}) {
  const section = (title: string) => <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide border-b border-black/30 pb-1">{title}</h2>;

  return (
    <div id="monthly-report-print" className="hidden bg-white p-8 text-black print:block">
      <div className="mb-6 flex items-start justify-between border-b border-black/20 pb-4">
        <div>
          <p className="text-lg font-bold tracking-wide">{store?.name?.toUpperCase() ?? ""}</p>
          {store?.address && <p className="text-xs">{store.address}</p>}
          <p className="text-xs">{[store?.city, store?.province, store?.postal_code].filter(Boolean).join(", ")}</p>
          {store?.phone && <p className="text-xs">Tel: {store.phone}</p>}
          {store?.tin && <p className="text-xs">TIN: {store.tin}</p>}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">Monthly Report</p>
          <p className="text-xs">{monthLabel}</p>
          <p className="mt-1 text-[10px] text-black/60">Printed {formatDate(new Date().toISOString())}</p>
        </div>
      </div>

      {section("Sales summary")}
      <div className="grid grid-cols-4 gap-3 text-xs">
        <div>
          <p className="text-black/60">Transactions</p>
          <p className="text-sm font-semibold">{summary.summary.total_transactions}</p>
        </div>
        <div>
          <p className="text-black/60">Total sales</p>
          <p className="text-sm font-semibold">{money(summary.summary.total_sales)}</p>
        </div>
        <div>
          <p className="text-black/60">Discounts</p>
          <p className="text-sm font-semibold">{money(summary.summary.total_discounts)}</p>
        </div>
        <div>
          <p className="text-black/60">Avg. transaction</p>
          <p className="text-sm font-semibold">{money(summary.summary.average_transaction)}</p>
        </div>
      </div>

      {section("Sales by day")}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-y border-black/30">
            <th className="py-1 text-left font-semibold">Date</th>
            <th className="py-1 text-right font-semibold">Transactions</th>
            <th className="py-1 text-right font-semibold">Total sales</th>
            <th className="py-1 text-right font-semibold">Discounts</th>
            <th className="py-1 text-right font-semibold">Avg. transaction</th>
          </tr>
        </thead>
        <tbody>
          {summary.data.map((d, i) => (
            <tr key={i} className="border-b border-black/10">
              <td className="py-1">{d.period}</td>
              <td className="py-1 text-right">{d.transaction_count}</td>
              <td className="py-1 text-right">{money(d.total_sales)}</td>
              <td className="py-1 text-right">{money(d.total_discounts)}</td>
              <td className="py-1 text-right">{money(d.average_transaction)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {section("Top products (by profit)")}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-y border-black/30">
            <th className="py-1 text-left font-semibold">Product</th>
            <th className="py-1 text-right font-semibold">Qty sold</th>
            <th className="py-1 text-right font-semibold">Revenue</th>
            <th className="py-1 text-right font-semibold">Profit</th>
            <th className="py-1 text-right font-semibold">Margin</th>
          </tr>
        </thead>
        <tbody>
          {products.data.map((p) => (
            <tr key={p.product_uuid} className="border-b border-black/10">
              <td className="py-1">
                {p.product_name} <span className="text-black/50">· {p.product_sku}</span>
              </td>
              <td className="py-1 text-right">{toNum(p.quantity_sold)}</td>
              <td className="py-1 text-right">{money(p.total_revenue)}</td>
              <td className="py-1 text-right">{money(p.gross_profit)}</td>
              <td className="py-1 text-right">{p.margin_percentage.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-8">
        <div>
          {section("Sales by category")}
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-y border-black/30">
                <th className="py-1 text-left font-semibold">Category</th>
                <th className="py-1 text-right font-semibold">Sales</th>
                <th className="py-1 text-right font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              {category.data.map((c, i) => (
                <tr key={i} className="border-b border-black/10">
                  <td className="py-1">{c.category_name}</td>
                  <td className="py-1 text-right">{money(c.total_sales)}</td>
                  <td className="py-1 text-right">{c.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          {section("Payment methods")}
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-y border-black/30">
                <th className="py-1 text-left font-semibold">Method</th>
                <th className="py-1 text-right font-semibold">Amount</th>
                <th className="py-1 text-right font-semibold">%</th>
              </tr>
            </thead>
            <tbody>
              {payment.data.map((p, i) => (
                <tr key={i} className="border-b border-black/10">
                  <td className="py-1 capitalize">{p.method}</td>
                  <td className="py-1 text-right">{money(p.total_amount)}</td>
                  <td className="py-1 text-right">{p.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {section("Inventory valuation (as of report date)")}
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-y border-black/30">
            <th className="py-1 text-left font-semibold">Category</th>
            <th className="py-1 text-right font-semibold">Products</th>
            <th className="py-1 text-right font-semibold">Units</th>
            <th className="py-1 text-right font-semibold">Value</th>
          </tr>
        </thead>
        <tbody>
          {valuation.data.map((v, i) => (
            <tr key={i} className="border-b border-black/10">
              <td className="py-1">{v.category_name}</td>
              <td className="py-1 text-right">{v.product_count}</td>
              <td className="py-1 text-right">{v.total_units}</td>
              <td className="py-1 text-right">{money(v.total_value)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-black/40 font-semibold">
            <td className="py-1">Total</td>
            <td className="py-1 text-right">{valuation.summary.total_products}</td>
            <td className="py-1 text-right">{valuation.summary.total_units}</td>
            <td className="py-1 text-right">{money(valuation.summary.total_value)}</td>
          </tr>
        </tbody>
      </table>

      {section(`Low stock alerts (as of report date · ${lowStock.count})`)}
      {lowStock.data.length === 0 ? (
        <p className="text-xs text-black/60">No products below reorder point.</p>
      ) : (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-y border-black/30">
              <th className="py-1 text-left font-semibold">Product</th>
              <th className="py-1 text-right font-semibold">Stock</th>
              <th className="py-1 text-right font-semibold">Reorder point</th>
              <th className="py-1 text-right font-semibold">Urgency</th>
            </tr>
          </thead>
          <tbody>
            {lowStock.data.map((r) => (
              <tr key={r.uuid} className="border-b border-black/10">
                <td className="py-1">
                  {r.name} <span className="text-black/50">· {r.sku}</span>
                </td>
                <td className="py-1 text-right">
                  {r.current_stock} {r.unit}
                </td>
                <td className="py-1 text-right">{r.reorder_point}</td>
                <td className="py-1 text-right capitalize">{r.urgency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {section("Stock movement")}
      {movement.data.length === 0 ? (
        <p className="text-xs text-black/60">No stock movement this period.</p>
      ) : (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-y border-black/30">
              <th className="py-1 text-left font-semibold">Date</th>
              <th className="py-1 text-left font-semibold">Product</th>
              <th className="py-1 text-left font-semibold">Type</th>
              <th className="py-1 text-right font-semibold">Change</th>
              <th className="py-1 text-right font-semibold">Balance after</th>
            </tr>
          </thead>
          <tbody>
            {movement.data.map((m) => (
              <tr key={m.uuid} className="border-b border-black/10">
                <td className="py-1 whitespace-nowrap">{formatDate(m.date)}</td>
                <td className="py-1">
                  {m.product?.name ?? "—"} <span className="text-black/50">· {m.product?.sku ?? "—"}</span>
                </td>
                <td className="py-1 capitalize">{m.type}</td>
                <td className="py-1 text-right">
                  {toNum(m.quantity_change) > 0 ? "+" : ""}
                  {toNum(m.quantity_change)}
                </td>
                <td className="py-1 text-right">{toNum(m.quantity_after)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-8 text-center text-[10px] text-black/50">This is a system-generated monthly report.</p>
    </div>
  );
}

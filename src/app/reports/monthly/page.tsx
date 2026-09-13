"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Download, Printer } from "lucide-react";
import {
  getInventoryValuationReport,
  getLowStockReport,
  getProductProfitabilityReport,
  getSalesByCategoryReport,
  getSalesByPaymentMethodReport,
  getSalesSummaryReport,
  getStockMovementReport,
  type InventoryValuationReport,
  type LowStockReportRow,
  type ProductProfitabilityReport,
  type SalesByCategoryReport,
  type SalesByPaymentMethodReport,
  type SalesSummaryReport,
  type StockMovementReport,
} from "@/lib/api/reports";
import { getStoreProfile, type StoreProfile } from "@/lib/api/settings";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { downloadCSV, formatDate, formatQty, toNum, formatMoney } from "@/lib/utils";
import { Badge, Button, EmptyState, Input, PageHeader, Spinner, Table, Td, Th } from "@/components/ui";
import { ColumnChart, MeterList, SERIES_1, SERIES_2, StatTile } from "@/components/charts";
import MonthlyReportPrint from "@/components/MonthlyReportPrint";

function monthRange(ym: string): { from: string; to: string; label: string } {
  const [y, m] = ym.split("-").map(Number);
  const from = `${ym}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${ym}-${String(lastDay).padStart(2, "0")}`;
  const label = new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return { from, to, label };
}

interface MonthlyData {
  summary: SalesSummaryReport;
  category: SalesByCategoryReport;
  payment: SalesByPaymentMethodReport;
  products: ProductProfitabilityReport;
  valuation: InventoryValuationReport;
  lowStock: { count: number; data: LowStockReportRow[] };
  movement: StockMovementReport;
}

export default function MonthlyReportPage() {
  const router = useRouter();
  const currency = useAuthStore((s) => s.user?.store.currency) ?? "PHP";
  const money = (n: number) => formatMoney(n, currency);

  const [ym, setYm] = useState(() => new Date().toISOString().slice(0, 7));
  const [data, setData] = useState<MonthlyData | null>(null);
  const [store, setStore] = useState<StoreProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { from, to, label } = monthRange(ym);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const [summary, category, payment, products, valuation, lowStock, movement, profile] = await Promise.all([
          getSalesSummaryReport(from, to, "day"),
          getSalesByCategoryReport(from, to),
          getSalesByPaymentMethodReport(from, to),
          getProductProfitabilityReport(from, to, 20),
          getInventoryValuationReport(),
          getLowStockReport(),
          getStockMovementReport(from, to),
          store ? Promise.resolve(store) : getStoreProfile(),
        ]);
        if (cancelled) return;
        setData({ summary, category, payment, products, valuation, lowStock, movement });
        setStore(profile);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load monthly report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  function exportSalesCSV() {
    if (!data) return;
    downloadCSV(
      `monthly-sales-${ym}.csv`,
      ["Date", "Transactions", "Total sales", "Discounts", "Avg. transaction"],
      data.summary.data.map((d) => [d.period, d.transaction_count, d.total_sales, d.total_discounts, d.average_transaction])
    );
  }

  function exportMovementCSV() {
    if (!data) return;
    downloadCSV(
      `monthly-stock-movement-${ym}.csv`,
      ["Date", "Product", "SKU", "Type", "Change", "Balance after"],
      data.movement.data.map((m) => [formatDate(m.date), m.product?.name ?? "—", m.product?.sku ?? "—", m.type, toNum(m.quantity_change), toNum(m.quantity_after)])
    );
  }

  return (
    <div className="p-6">
      <button
        onClick={() => router.push("/reports")}
        className="mb-3 flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink cursor-pointer print:hidden"
      >
        <ArrowLeft size={14} /> Back to reports
      </button>

      <div className="print:hidden">
        <PageHeader
          title="Monthly Report"
          subtitle={label}
          actions={
            <>
              <Button variant="secondary" onClick={exportSalesCSV} disabled={!data}>
                <Download size={15} /> Sales CSV
              </Button>
              <Button variant="secondary" onClick={exportMovementCSV} disabled={!data}>
                <Download size={15} /> Stock CSV
              </Button>
              <Button onClick={() => window.print()} disabled={!data}>
                <Printer size={15} /> Print
              </Button>
            </>
          }
        />

        <div className="mb-4">
          <Input type="month" value={ym} onChange={(e) => setYm(e.target.value)} className="w-48" aria-label="Select month" />
        </div>

        {loading ? (
          <div className="flex justify-center py-14">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <AlertTriangle size={24} className="text-status-critical" />
            <p className="text-sm font-medium text-status-critical">{error}</p>
          </div>
        ) : data ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile label="Transactions" value={String(data.summary.summary.total_transactions)} />
              <StatTile label="Total sales" value={money(data.summary.summary.total_sales)} />
              <StatTile label="Discounts" value={money(data.summary.summary.total_discounts)} />
              <StatTile label="Avg. transaction" value={money(data.summary.summary.average_transaction)} />
            </div>

            <div className="card p-4">
              <h2 className="mb-3 text-sm font-semibold">Sales by day</h2>
              {data.summary.data.length === 0 ? (
                <EmptyState icon={<AlertTriangle size={24} />} title="No sales this month" />
              ) : (
                <ColumnChart
                  data={data.summary.data.map((d) => ({ label: d.period.slice(-2), value: d.total_sales, sub: `${d.transaction_count} sales` }))}
                  height={200}
                />
              )}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="card p-4">
                <h2 className="mb-3 text-sm font-semibold">Sales by category</h2>
                {data.category.data.length === 0 ? (
                  <EmptyState icon={<AlertTriangle size={24} />} title="No category sales" />
                ) : (
                  <MeterList
                    color={SERIES_1}
                    rows={data.category.data.map((c) => ({ label: c.category_name, value: c.total_sales, display: money(c.total_sales), sub: `${c.percentage.toFixed(1)}%` }))}
                  />
                )}
              </div>
              <div className="card p-4">
                <h2 className="mb-3 text-sm font-semibold">Payment methods</h2>
                {data.payment.data.length === 0 ? (
                  <EmptyState icon={<AlertTriangle size={24} />} title="No payments" />
                ) : (
                  <MeterList
                    color={SERIES_2}
                    rows={data.payment.data.map((p) => ({ label: p.method, value: p.total_amount, display: money(p.total_amount), sub: `${p.percentage.toFixed(1)}%` }))}
                  />
                )}
              </div>
            </div>

            <div className="card">
              <div className="border-b border-black/[0.07] p-4">
                <h2 className="text-sm font-semibold">Top products (by profit)</h2>
              </div>
              {data.products.data.length === 0 ? (
                <EmptyState icon={<AlertTriangle size={24} />} title="No product sales this month" />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Product</Th>
                      <Th right>Qty sold</Th>
                      <Th right>Revenue</Th>
                      <Th right>Profit</Th>
                      <Th right>Margin</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.data.map((p) => (
                      <tr key={p.product_uuid}>
                        <Td>
                          <p className="font-medium">{p.product_name}</p>
                          <p className="text-xs text-ink-muted">{p.product_sku}</p>
                        </Td>
                        <Td right>{formatQty(p.quantity_sold)}</Td>
                        <Td right>{money(p.total_revenue)}</Td>
                        <Td right className="font-medium">
                          {money(p.gross_profit)}
                        </Td>
                        <Td right>{p.margin_percentage.toFixed(1)}%</Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>

            <div className="card">
              <div className="border-b border-black/[0.07] p-4">
                <h2 className="text-sm font-semibold">Inventory valuation</h2>
                <p className="text-xs text-ink-muted">As of report date — not historical for the selected month</p>
              </div>
              <Table>
                <thead>
                  <tr>
                    <Th>Category</Th>
                    <Th right>Products</Th>
                    <Th right>Units</Th>
                    <Th right>Value</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.valuation.data.map((v, i) => (
                    <tr key={i}>
                      <Td>{v.category_name}</Td>
                      <Td right>{v.product_count}</Td>
                      <Td right>{formatQty(v.total_units)}</Td>
                      <Td right className="font-medium">
                        {money(v.total_value)}
                      </Td>
                    </tr>
                  ))}
                  <tr className="border-t border-black/[0.08] font-semibold">
                    <Td>Total</Td>
                    <Td right>{data.valuation.summary.total_products}</Td>
                    <Td right>{formatQty(data.valuation.summary.total_units)}</Td>
                    <Td right>{money(data.valuation.summary.total_value)}</Td>
                  </tr>
                </tbody>
              </Table>
            </div>

            <div className="card">
              <div className="border-b border-black/[0.07] p-4">
                <h2 className="text-sm font-semibold">Low stock alerts</h2>
                <p className="text-xs text-ink-muted">As of report date · {data.lowStock.count} product{data.lowStock.count === 1 ? "" : "s"}</p>
              </div>
              {data.lowStock.data.length === 0 ? (
                <EmptyState icon={<AlertTriangle size={24} />} title="No products below reorder point" />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Product</Th>
                      <Th right>Stock</Th>
                      <Th right>Reorder point</Th>
                      <Th right>Urgency</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lowStock.data.map((r) => (
                      <tr key={r.uuid}>
                        <Td>
                          <p className="font-medium">{r.name}</p>
                          <p className="text-xs text-ink-muted">{r.sku}</p>
                        </Td>
                        <Td right>
                          {formatQty(r.current_stock)} {r.unit}
                        </Td>
                        <Td right>{formatQty(r.reorder_point)}</Td>
                        <Td right>
                          <Badge tone={r.urgency === "high" ? "critical" : r.urgency === "medium" ? "warning" : "neutral"} className="capitalize">
                            {r.urgency}
                          </Badge>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>

            <div className="card">
              <div className="border-b border-black/[0.07] p-4">
                <h2 className="text-sm font-semibold">Stock movement</h2>
              </div>
              {data.movement.data.length === 0 ? (
                <EmptyState icon={<AlertTriangle size={24} />} title="No stock movement this period" />
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Date</Th>
                      <Th>Product</Th>
                      <Th>Type</Th>
                      <Th right>Change</Th>
                      <Th right>Balance after</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.movement.data.map((m) => (
                      <tr key={m.uuid}>
                        <Td className="whitespace-nowrap text-ink-secondary">{formatDate(m.date)}</Td>
                        <Td>
                          <p className="font-medium">{m.product?.name ?? "—"}</p>
                          <p className="text-xs text-ink-muted">{m.product?.sku ?? "—"}</p>
                        </Td>
                        <Td className="capitalize">{m.type}</Td>
                        <Td right className={toNum(m.quantity_change) < 0 ? "text-status-critical" : "text-[#006300]"}>
                          {toNum(m.quantity_change) > 0 ? "+" : ""}
                          {formatQty(m.quantity_change)}
                        </Td>
                        <Td right className="font-medium">
                          {formatQty(m.quantity_after)}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Print-only full-page report. Global print CSS reveals only #monthly-report-print. */}
      {data && (
        <MonthlyReportPrint
          monthLabel={label}
          store={store?.store ?? null}
          summary={data.summary}
          category={data.category}
          payment={data.payment}
          products={data.products}
          valuation={data.valuation}
          lowStock={data.lowStock}
          movement={data.movement}
          money={money}
        />
      )}
    </div>
  );
}

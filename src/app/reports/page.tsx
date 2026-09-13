"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BarChart3, CalendarRange, Download, Printer, ReceiptText, RotateCcw, Search } from "lucide-react";
import {
  getCreditCollectionReport,
  getCreditReportAging,
  getDailySalesReport,
  getProductProfitabilityReport,
  getSalesByCashierReport,
  getSalesByCategoryReport,
  getSalesByCustomerReport,
  getSalesByPaymentMethodReport,
  getSalesSummaryReport,
  type CreditCollectionReport,
  type CreditReportAgingReport,
  type DailySalesReport,
  type ProductProfitabilityReport,
  type SalesByCashierReport,
  type SalesByCategoryReport,
  type SalesByCustomerReport,
  type SalesByPaymentMethodReport,
  type SalesSummaryReport,
} from "@/lib/api/reports";
import { getSaleReceipt, listSales, refundSale, voidSale, type Sale } from "@/lib/api/sales";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { cx, dayKey, daysAgo, downloadCSV, formatDateTime, formatNumber, formatQty } from "@/lib/utils";
import { Badge, Button, EmptyState, Input, Modal, PageHeader, PromptDialog, Spinner, Table, Td, Th } from "@/components/ui";
import { ColumnChart, MeterList, SERIES_2 } from "@/components/charts";
import ApiReceipt from "@/components/ApiReceipt";

type Tab = "summary" | "products" | "categories" | "payments" | "customers" | "cashiers" | "transactions" | "credit";

const tabs: { value: Tab; label: string }[] = [
  { value: "summary", label: "Sales summary" },
  { value: "products", label: "Product profitability" },
  { value: "categories", label: "Category sales" },
  { value: "payments", label: "Payments" },
  { value: "customers", label: "Top customers" },
  { value: "cashiers", label: "Cashiers" },
  { value: "transactions", label: "Transactions" },
  { value: "credit", label: "Credit" },
];

type Preset = "today" | "yesterday" | "7d" | "30d" | "mtd" | "custom";

const presets: { value: Preset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "mtd", label: "Month to date" },
  { value: "custom", label: "Custom" },
];

function presetRange(p: Preset, customFrom: string, customTo: string): { from: string; to: string; singleDay: boolean } {
  const today = new Date();
  switch (p) {
    case "today":
      return { from: dayKey(today), to: dayKey(today), singleDay: true };
    case "yesterday": {
      const y = dayKey(daysAgo(1));
      return { from: y, to: y, singleDay: true };
    }
    case "7d":
      return { from: dayKey(daysAgo(6)), to: dayKey(today), singleDay: false };
    case "30d":
      return { from: dayKey(daysAgo(29)), to: dayKey(today), singleDay: false };
    case "mtd":
      return { from: dayKey(new Date(today.getFullYear(), today.getMonth(), 1)), to: dayKey(today), singleDay: false };
    case "custom": {
      const from = customFrom || dayKey(daysAgo(6));
      const to = customTo || dayKey(today);
      return from <= to ? { from, to, singleDay: from === to } : { from: to, to: from, singleDay: from === to };
    }
  }
}

export default function ReportsPage() {
  return (
    <Suspense>
      <Reports />
    </Suspense>
  );
}

function Reports() {
  const params = useSearchParams();
  const initialTab = (params.get("tab") as Tab) || "summary";
  const [tab, setTab] = useState<Tab>(tabs.some((t) => t.value === initialTab) ? initialTab : "summary");
  const [preset, setPreset] = useState<Preset>("7d");
  const [customFrom, setCustomFrom] = useState(dayKey(daysAgo(6)));
  const [customTo, setCustomTo] = useState(dayKey(new Date()));

  const currency = useAuthStore((s) => s.user?.store.currency) ?? "PHP";
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);
  const canViewCredit = useAuthStore((s) => hasPermission(s.user?.role, s.permissions, PERMISSIONS.REPORTS_VIEW_CREDIT));
  const canExport = useAuthStore((s) => hasPermission(s.user?.role, s.permissions, PERMISSIONS.REPORTS_EXPORT));
  const canVoid = useAuthStore((s) => hasPermission(s.user?.role, s.permissions, PERMISSIONS.SALES_VOID));
  const canRefund = useAuthStore((s) => hasPermission(s.user?.role, s.permissions, PERMISSIONS.SALES_REFUND));
  const visibleTabs = useMemo(() => tabs.filter((t) => t.value !== "credit" || canViewCredit), [canViewCredit]);
  const activeTab = tab === "credit" && !canViewCredit ? "summary" : tab;

  const range = useMemo(() => presetRange(preset, customFrom, customTo), [preset, customFrom, customTo]);
  const rangeLabel = range.singleDay ? range.from : `${range.from} – ${range.to}`;

  return (
    <div className="p-6">
      <PageHeader
        title="Reports"
        subtitle={rangeLabel}
        actions={
          <Link href="/reports/monthly" prefetch={false}>
            <Button variant="secondary">
              <CalendarRange size={15} /> Monthly Report
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg border border-black/10 bg-card p-0.5 shadow-sm">
          {presets.map((p) => (
            <button
              key={p.value}
              onClick={() => setPreset(p.value)}
              className={cx(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                preset === p.value ? "bg-brand text-white" : "text-ink-secondary hover:text-ink"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {preset === "custom" && (
          <div className="flex items-center gap-1.5">
            <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-38" aria-label="From date" />
            <span className="text-xs text-ink-muted">to</span>
            <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-38" aria-label="To date" />
          </div>
        )}
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b border-black/[0.08]">
        {visibleTabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cx(
              "-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors cursor-pointer",
              activeTab === t.value ? "border-brand text-brand-strong" : "border-transparent text-ink-secondary hover:text-ink"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "summary" && <SummaryTab range={range} money={money} />}
      {activeTab === "products" && <ProductsTab range={range} money={money} rangeLabel={rangeLabel} canExport={canExport} />}
      {activeTab === "categories" && <CategoriesTab range={range} money={money} rangeLabel={rangeLabel} canExport={canExport} />}
      {activeTab === "payments" && <PaymentsTab range={range} money={money} rangeLabel={rangeLabel} canExport={canExport} />}
      {activeTab === "customers" && <CustomersTab range={range} money={money} rangeLabel={rangeLabel} canExport={canExport} />}
      {activeTab === "cashiers" && <CashiersTab range={range} money={money} rangeLabel={rangeLabel} canExport={canExport} />}
      {activeTab === "transactions" && <TransactionsTab range={range} money={money} canVoid={canVoid} canRefund={canRefund} />}
      {activeTab === "credit" && canViewCredit && <CreditTab range={range} money={money} rangeLabel={rangeLabel} />}
    </div>
  );
}

function useReport<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await load();
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load report");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error };
}

function ReportShell<T>({
  loading,
  error,
  data,
  children,
}: {
  loading: boolean;
  error: string | null;
  data: T | null;
  children: (data: T) => React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-14">
        <Spinner size="md" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="card p-8 text-center text-sm font-medium text-status-critical">{error ?? "No data"}</div>
    );
  }
  return <>{children(data)}</>;
}

/* ---------- Summary ---------- */

function SummaryTab({ range, money }: { range: { from: string; to: string; singleDay: boolean }; money: (n: number) => string }) {
  const daily = useReport<DailySalesReport>(() => getDailySalesReport(range.from), [range.from, range.singleDay]);
  const summary = useReport<SalesSummaryReport>(() => getSalesSummaryReport(range.from, range.to, "day"), [range.from, range.to]);
  const payments = useReport<SalesByPaymentMethodReport>(() => getSalesByPaymentMethodReport(range.from, range.to), [range.from, range.to]);

  if (range.singleDay) {
    return (
      <ReportShell loading={daily.loading} error={daily.error} data={daily.data}>
        {(d) => (
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="card p-4">
              <h2 className="mb-3 text-sm font-semibold">Sales summary</h2>
              <SummaryLines
                lines={[
                  { label: "Transactions", value: formatNumber(d.summary.transaction_count) },
                  { label: "Total sales", value: money(d.summary.total_sales) },
                  { label: "Discounts", value: `-${money(d.summary.total_discounts)}` },
                  { label: "Average transaction", value: money(d.summary.average_transaction), strong: true },
                ]}
              />
            </div>
            <div className="card p-4 xl:col-span-2">
              <h2 className="mb-1 text-sm font-semibold">Sales by hour</h2>
              <ColumnChart
                data={d.hourly_breakdown.map((h) => ({ label: `${h.hour}:00`, value: h.total_sales, sub: `${h.transaction_count} sales` }))}
                height={220}
                valueFormat={money}
              />
            </div>
            <div className="card p-4 xl:col-span-3">
              <h2 className="mb-3 text-sm font-semibold">Top products that day</h2>
              {d.top_products.length === 0 ? (
                <EmptyState icon={<BarChart3 size={24} />} title="No sales" />
              ) : (
                <MeterList rows={d.top_products.map((p) => ({ label: p.product_name, value: p.revenue, display: money(p.revenue) }))} />
              )}
            </div>
          </div>
        )}
      </ReportShell>
    );
  }

  return (
    <ReportShell loading={summary.loading} error={summary.error} data={summary.data}>
      {(s) => (
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">Sales summary</h2>
            <SummaryLines
              lines={[
                { label: "Transactions", value: formatNumber(s.summary.total_transactions) },
                { label: "Total sales", value: money(s.summary.total_sales) },
                { label: "Discounts", value: `-${money(s.summary.total_discounts)}` },
                { label: "Average transaction", value: money(s.summary.average_transaction), strong: true },
              ]}
            />
          </div>
          <div className="card p-4 xl:col-span-2">
            <h2 className="mb-1 text-sm font-semibold">Sales by period</h2>
            <ColumnChart
              data={s.data.map((p) => ({ label: p.period, value: p.total_sales, sub: `${p.transaction_count} sales` }))}
              height={220}
              valueFormat={money}
            />
          </div>
          <div className="card p-4 xl:col-span-3">
            <h2 className="mb-3 text-sm font-semibold">Payments collected</h2>
            <ReportShell loading={payments.loading} error={payments.error} data={payments.data}>
              {(p) =>
                p.data.length === 0 ? (
                  <EmptyState icon={<BarChart3 size={24} />} title="No payments in range" />
                ) : (
                  <MeterList
                    color={SERIES_2}
                    rows={p.data.map((row) => ({ label: row.method, value: row.total_amount, display: money(row.total_amount), sub: `${row.transaction_count} payments` }))}
                  />
                )
              }
            </ReportShell>
          </div>
        </div>
      )}
    </ReportShell>
  );
}

function SummaryLines({ lines }: { lines: { label: string; value: string; strong?: boolean }[] }) {
  return (
    <div className="flex flex-col">
      {lines.map((l) => (
        <div key={l.label} className={cx("flex items-center justify-between border-b border-black/[0.05] py-2 text-sm last:border-0", l.strong && "font-semibold")}>
          <span className={cx(!l.strong && "text-ink-secondary")}>{l.label}</span>
          <span className="tabular">{l.value}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Products (profitability) ---------- */

function ProductsTab({
  range,
  money,
  rangeLabel,
  canExport,
}: {
  range: { from: string; to: string };
  money: (n: number) => string;
  rangeLabel: string;
  canExport: boolean;
}) {
  const { data, loading, error } = useReport<ProductProfitabilityReport>(
    () => getProductProfitabilityReport(range.from, range.to, 50),
    [range.from, range.to]
  );
  return (
    <ReportShell loading={loading} error={error} data={data}>
      {(r) => (
        <div className="card">
          <TableHeader
            title={`${r.data.length} products · ${money(r.summary.total_revenue)} revenue`}
            canExport={canExport}
            onExport={() =>
              downloadCSV(
                "product-profitability.csv",
                ["SKU", "Product", "Qty sold", "Revenue", "Cost", "Profit", "Margin %"],
                r.data.map((p) => [p.product_sku, p.product_name, p.quantity_sold, p.total_revenue, p.total_cost, p.gross_profit, p.margin_percentage])
              )
            }
          />
          {r.data.length === 0 ? (
            <EmptyState icon={<BarChart3 size={28} />} title={`No sales between ${rangeLabel}`} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Product</Th>
                  <Th right>Qty sold</Th>
                  <Th right>Revenue</Th>
                  <Th right>Cost</Th>
                  <Th right>Profit</Th>
                  <Th right>Margin</Th>
                </tr>
              </thead>
              <tbody>
                {r.data.map((p, i) => (
                  <tr key={p.product_uuid} className="hover:bg-black/[0.015]">
                    <Td className="text-ink-muted">{i + 1}</Td>
                    <Td>
                      <span className="font-medium">{p.product_name}</span>
                      <span className="ml-2 font-mono text-xs text-ink-muted">{p.product_sku}</span>
                    </Td>
                    <Td right>{formatQty(p.quantity_sold)}</Td>
                    <Td right className="font-medium">{money(p.total_revenue)}</Td>
                    <Td right>{money(p.total_cost)}</Td>
                    <Td right>{money(p.gross_profit)}</Td>
                    <Td right className="text-ink-secondary">{p.margin_percentage.toFixed(0)}%</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}
    </ReportShell>
  );
}

/* ---------- Categories ---------- */

function CategoriesTab({
  range,
  money,
  rangeLabel,
  canExport,
}: {
  range: { from: string; to: string };
  money: (n: number) => string;
  rangeLabel: string;
  canExport: boolean;
}) {
  const { data, loading, error } = useReport<SalesByCategoryReport>(() => getSalesByCategoryReport(range.from, range.to), [range.from, range.to]);
  return (
    <ReportShell loading={loading} error={error} data={data}>
      {(r) => (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">Net sales by category</h2>
            {r.data.length === 0 ? (
              <EmptyState icon={<BarChart3 size={28} />} title={`No sales between ${rangeLabel}`} />
            ) : (
              <MeterList rows={r.data.map((c) => ({ label: c.category_name, value: c.total_sales, display: money(c.total_sales) }))} />
            )}
          </div>
          <div className="card">
            <TableHeader
              title="Category detail"
              canExport={canExport}
              onExport={() =>
                downloadCSV(
                  "category-sales.csv",
                  ["Category", "Qty sold", "Sales", "% of sales", "Transactions"],
                  r.data.map((c) => [c.category_name, c.total_quantity, c.total_sales, c.percentage, c.transaction_count])
                )
              }
            />
            <Table>
              <thead>
                <tr>
                  <Th>Category</Th>
                  <Th right>Qty</Th>
                  <Th right>Sales</Th>
                  <Th right>% of sales</Th>
                </tr>
              </thead>
              <tbody>
                {r.data.map((c) => (
                  <tr key={c.category_name} className="hover:bg-black/[0.015]">
                    <Td className="font-medium">{c.category_name}</Td>
                    <Td right>{c.total_quantity}</Td>
                    <Td right className="font-medium">{money(c.total_sales)}</Td>
                    <Td right className="text-ink-secondary">{c.percentage.toFixed(1)}%</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      )}
    </ReportShell>
  );
}

/* ---------- Payments ---------- */

function PaymentsTab({
  range,
  money,
  rangeLabel,
  canExport,
}: {
  range: { from: string; to: string };
  money: (n: number) => string;
  rangeLabel: string;
  canExport: boolean;
}) {
  const { data, loading, error } = useReport<SalesByPaymentMethodReport>(() => getSalesByPaymentMethodReport(range.from, range.to), [range.from, range.to]);
  return (
    <ReportShell loading={loading} error={error} data={data}>
      {(r) => (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">Collected by payment method</h2>
            {r.data.length === 0 ? (
              <EmptyState icon={<BarChart3 size={28} />} title={`No payments between ${rangeLabel}`} />
            ) : (
              <MeterList color={SERIES_2} rows={r.data.map((p) => ({ label: p.method, value: p.total_amount, display: money(p.total_amount), sub: `${p.transaction_count} payments` }))} />
            )}
          </div>
          <div className="card">
            <TableHeader
              title="Method detail"
              canExport={canExport}
              onExport={() =>
                downloadCSV(
                  "payments.csv",
                  ["Method", "Payments", "Amount", "% of total"],
                  r.data.map((p) => [p.method, p.transaction_count, p.total_amount, p.percentage])
                )
              }
            />
            <Table>
              <thead>
                <tr>
                  <Th>Method</Th>
                  <Th right>Payments</Th>
                  <Th right>Amount</Th>
                  <Th right>% of total</Th>
                </tr>
              </thead>
              <tbody>
                {r.data.map((p) => (
                  <tr key={p.method} className="hover:bg-black/[0.015]">
                    <Td className="font-medium capitalize">{p.method}</Td>
                    <Td right>{p.transaction_count}</Td>
                    <Td right className="font-medium">{money(p.total_amount)}</Td>
                    <Td right className="text-ink-secondary">{p.percentage.toFixed(1)}%</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      )}
    </ReportShell>
  );
}

/* ---------- Customers ---------- */

function CustomersTab({
  range,
  money,
  rangeLabel,
  canExport,
}: {
  range: { from: string; to: string };
  money: (n: number) => string;
  rangeLabel: string;
  canExport: boolean;
}) {
  const { data, loading, error } = useReport<SalesByCustomerReport>(() => getSalesByCustomerReport(range.from, range.to, 50), [range.from, range.to]);
  return (
    <ReportShell loading={loading} error={error} data={data}>
      {(r) => (
        <div className="card">
          <TableHeader
            title={`${r.data.length} customers with purchases`}
            canExport={canExport}
            onExport={() =>
              downloadCSV(
                "top-customers.csv",
                ["Customer", "Transactions", "Total purchases", "Avg order", "Last purchase"],
                r.data.map((p) => [p.customer.name, p.transaction_count, p.total_purchases, p.average_order_value, p.last_purchase_date])
              )
            }
          />
          {r.data.length === 0 ? (
            <EmptyState icon={<BarChart3 size={28} />} title={`No customer-linked sales between ${rangeLabel}`} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Customer</Th>
                  <Th right>Transactions</Th>
                  <Th right>Total purchases</Th>
                  <Th right>Avg order</Th>
                  <Th>Last purchase</Th>
                </tr>
              </thead>
              <tbody>
                {r.data.map((p, i) => (
                  <tr key={p.customer.uuid} className="hover:bg-black/[0.015]">
                    <Td className="text-ink-muted">{i + 1}</Td>
                    <Td className="font-medium">{p.customer.name}</Td>
                    <Td right>{p.transaction_count}</Td>
                    <Td right className="font-medium">{money(p.total_purchases)}</Td>
                    <Td right>{money(p.average_order_value)}</Td>
                    <Td className="text-ink-secondary">{p.last_purchase_date}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}
    </ReportShell>
  );
}

/* ---------- Cashiers ---------- */

function CashiersTab({
  range,
  money,
  rangeLabel,
  canExport,
}: {
  range: { from: string; to: string };
  money: (n: number) => string;
  rangeLabel: string;
  canExport: boolean;
}) {
  const { data, loading, error } = useReport<SalesByCashierReport>(() => getSalesByCashierReport(range.from, range.to), [range.from, range.to]);
  return (
    <ReportShell loading={loading} error={error} data={data}>
      {(r) => (
        <div className="card">
          <TableHeader
            title="Sales by cashier"
            canExport={canExport}
            onExport={() =>
              downloadCSV(
                "sales-by-cashier.csv",
                ["Cashier", "Transactions", "Total sales", "Avg transaction"],
                r.data.map((c) => [c.cashier_name, c.transaction_count, c.total_sales, c.average_transaction])
              )
            }
          />
          {r.data.length === 0 ? (
            <EmptyState icon={<BarChart3 size={28} />} title={`No sales between ${rangeLabel}`} />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Cashier</Th>
                  <Th right>Transactions</Th>
                  <Th right>Total sales</Th>
                  <Th right>Avg transaction</Th>
                </tr>
              </thead>
              <tbody>
                {r.data.map((c) => (
                  <tr key={c.cashier_name} className="hover:bg-black/[0.015]">
                    <Td className="font-medium">{c.cashier_name}</Td>
                    <Td right>{c.transaction_count}</Td>
                    <Td right className="font-medium">{money(c.total_sales)}</Td>
                    <Td right>{money(c.average_transaction)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}
    </ReportShell>
  );
}

/* ---------- Credit ---------- */

function CreditTab({ range, money, rangeLabel }: { range: { from: string; to: string }; money: (n: number) => string; rangeLabel: string }) {
  const aging = useReport<CreditReportAgingReport>(() => getCreditReportAging(), []);
  const collection = useReport<CreditCollectionReport>(() => getCreditCollectionReport(range.from, range.to), [range.from, range.to]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold">Credit aging</h2>
        <ReportShell loading={aging.loading} error={aging.error} data={aging.data}>
          {(a) => (
            <>
              <div className="mb-3 grid grid-cols-4 gap-2 text-center">
                <AgingStat label="Current" value={money(a.summary.current)} />
                <AgingStat label="31-60d" value={money(a.summary.days_31_60)} />
                <AgingStat label="61-90d" value={money(a.summary.days_61_90)} />
                <AgingStat label=">90d" value={money(a.summary.days_over_90)} tone="critical" />
              </div>
              {a.customers.length === 0 ? (
                <EmptyState icon={<BarChart3 size={24} />} title="No outstanding balances" />
              ) : (
                <div className="flex flex-col gap-1.5">
                  {a.customers.slice(0, 10).map((c) => (
                    <div key={c.uuid} className="flex items-center justify-between rounded-lg border border-black/[0.06] px-3 py-2 text-sm">
                      <span className="truncate font-medium">{c.name}</span>
                      <span className="tabular">{money(c.total_outstanding)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </ReportShell>
      </div>
      <div className="card p-4">
        <h2 className="mb-1 text-sm font-semibold">Collections</h2>
        <p className="mb-3 text-xs text-ink-muted">{rangeLabel}</p>
        <ReportShell loading={collection.loading} error={collection.error} data={collection.data}>
          {(c) =>
            c.by_method.length === 0 ? (
              <EmptyState icon={<BarChart3 size={24} />} title="No collections in range" />
            ) : (
              <>
                <div className="mb-3 rounded-lg bg-black/[0.04] px-3 py-2.5">
                  <p className="text-xs text-ink-secondary">Total collected</p>
                  <p className="text-lg font-semibold">{money(c.summary.total_collected)}</p>
                </div>
                <MeterList color={SERIES_2} rows={c.by_method.map((m) => ({ label: m.payment_method, value: m.total_collected, display: money(m.total_collected), sub: `${m.payment_count} payments` }))} />
              </>
            )
          }
        </ReportShell>
      </div>
    </div>
  );
}

function AgingStat({ label, value, tone }: { label: string; value: string; tone?: "critical" }) {
  return (
    <div className="rounded-lg bg-black/[0.04] px-2 py-2">
      <p className={cx("text-sm font-semibold", tone === "critical" && "text-status-critical")}>{value}</p>
      <p className="text-[11px] text-ink-secondary">{label}</p>
    </div>
  );
}

/* ---------- Transactions ---------- */

function TransactionsTab({
  range,
  money,
  canVoid,
  canRefund,
}: {
  range: { from: string; to: string };
  money: (n: number) => string;
  canVoid: boolean;
  canRefund: boolean;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sales, setSales] = useState<Sale[]>([]);
  const [lastPage, setLastPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [viewing, setViewing] = useState<Sale | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<import("@/lib/api/sales").SaleReceipt | null>(null);
  const [voiding, setVoiding] = useState<Sale | null>(null);
  const [refunding, setRefunding] = useState<Sale | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await listSales({ page, per_page: 20, date_from: range.from, date_to: range.to, search: query || undefined });
        if (cancelled) return;
        setSales(res.items);
        setLastPage(res.lastPage);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load transactions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [page, range.from, range.to, query, refreshKey]);

  function refetch() {
    setRefreshKey((k) => k + 1);
  }

  async function openReceipt(sale: Sale) {
    setViewing(sale);
    try {
      const receipt = await getSaleReceipt(sale.uuid);
      setViewingReceipt(receipt);
    } catch {
      setViewingReceipt(null);
    }
  }

  async function doVoid(reason: string) {
    if (!voiding) return;
    setActionError(null);
    setActionBusy(true);
    try {
      await voidSale(voiding.uuid, reason);
      setVoiding(null);
      setViewing(null);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to void sale");
    } finally {
      setActionBusy(false);
    }
  }

  async function doRefund(reason: string) {
    if (!refunding) return;
    setActionError(null);
    setActionBusy(true);
    try {
      const items = refunding.items.filter((i) => !i.is_refund).map((i) => ({ sale_item_id: i.id, quantity: i.quantity }));
      await refundSale(refunding.uuid, items, reason);
      setRefunding(null);
      setViewing(null);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to refund sale");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.07] p-3">
        <div className="relative w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search sale number…"
            className="pl-9"
          />
        </div>
      </div>
      {error ? (
        <div className="flex flex-col items-center gap-2 py-14 text-center">
          <p className="text-sm font-medium text-status-critical">{error}</p>
          <Button variant="secondary" size="sm" onClick={refetch}>
            Retry
          </Button>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-14">
          <Spinner size="md" />
        </div>
      ) : sales.length === 0 ? (
        <EmptyState icon={<ReceiptText size={28} />} title="No transactions in this period" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Sale #</Th>
              <Th>Date</Th>
              <Th>Customer</Th>
              <Th right>Items</Th>
              <Th right>Total</Th>
              <Th>Payment</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.uuid} className="cursor-pointer hover:bg-black/[0.015]" onClick={() => openReceipt(s)}>
                <Td>
                  <span className="font-mono text-xs font-medium">{s.sale_number}</span>
                </Td>
                <Td className="whitespace-nowrap text-ink-secondary">{formatDateTime(s.sale_date)}</Td>
                <Td>{s.customer?.name ?? <span className="text-ink-muted">Walk-in</span>}</Td>
                <Td right>{s.items.filter((i) => !i.is_refund).length}</Td>
                <Td right className="font-medium">{money(parseFloat(s.total_amount))}</Td>
                <Td className="capitalize text-ink-secondary">{s.payments.map((p) => p.method).join(", ")}</Td>
                <Td>
                  {s.status === "voided" ? <Badge tone="critical">Voided</Badge> : s.status === "refunded" ? <Badge tone="critical">Refunded</Badge> : <Badge tone="good">Completed</Badge>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {!error && !loading && sales.length > 0 && (
        <div className="flex items-center justify-between border-t border-black/[0.07] px-3 py-2.5 text-xs text-ink-secondary">
          <span>
            Page {page}
            {lastPage ? ` of ${lastPage}` : ""}
          </span>
          <div className="flex gap-1.5">
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </Button>
            <Button size="sm" variant="secondary" disabled={lastPage !== null && page >= lastPage} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={viewing !== null}
        onClose={() => {
          setViewing(null);
          setViewingReceipt(null);
        }}
        title={`Receipt ${viewing?.sale_number ?? ""}`}
        width="max-w-md"
        footer={
          <>
            {viewing?.status === "completed" && (
              <>
                {canRefund && (
                  <Button variant="ghost" onClick={() => setRefunding(viewing)}>
                    <RotateCcw size={14} /> Refund all
                  </Button>
                )}
                {canVoid && (
                  <Button variant="ghost" onClick={() => setVoiding(viewing)}>
                    Void
                  </Button>
                )}
              </>
            )}
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={15} /> Print
            </Button>
          </>
        }
      >
        {viewingReceipt ? (
          <div className="rounded-lg border border-black/[0.08] bg-[#fcfcfb] p-4">
            <ApiReceipt receipt={viewingReceipt} />
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <Spinner size="sm" />
          </div>
        )}
      </Modal>

      <PromptDialog
        open={voiding !== null}
        onClose={() => {
          setVoiding(null);
          setActionError(null);
        }}
        onSubmit={doVoid}
        title="Void sale"
        message={voiding ? `Void ${voiding.sale_number} for ${money(parseFloat(voiding.total_amount))}? Stock returns to inventory.` : ""}
        label="Reason for voiding"
        placeholder="e.g. Cashier error, duplicate ring-up…"
        confirmLabel="Void sale"
        tone="danger"
        multiline
        busy={actionBusy}
        error={actionError}
      />

      <PromptDialog
        open={refunding !== null}
        onClose={() => {
          setRefunding(null);
          setActionError(null);
        }}
        onSubmit={doRefund}
        title="Refund sale"
        message={refunding ? `Refund all items on ${refunding.sale_number} for ${money(parseFloat(refunding.total_amount))}? Stock returns to inventory.` : ""}
        label="Reason for refund"
        placeholder="e.g. Damaged goods returned by customer…"
        confirmLabel="Refund sale"
        tone="danger"
        multiline
        busy={actionBusy}
        error={actionError}
      />
    </div>
  );
}

function TableHeader({ title, onExport, canExport = true }: { title: string; onExport: () => void; canExport?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-black/[0.07] px-4 py-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {canExport && (
        <Button size="sm" variant="secondary" onClick={onExport}>
          <Download size={13} /> CSV
        </Button>
      )}
    </div>
  );
}

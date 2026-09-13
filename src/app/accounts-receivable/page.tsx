"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Banknote, CreditCard, Percent, Users, Wallet } from "lucide-react";
import {
  getCreditAging,
  getCreditOverview,
  getOverdueAccounts,
  type CreditAgingReport,
  type CreditOverview,
  type OverdueAccount,
} from "@/lib/api/customers";
import { getCreditCollectionReport, type CreditCollectionReport } from "@/lib/api/reports";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { cx, formatDate } from "@/lib/utils";
import { Badge, EmptyState, PageHeader, Segmented, Spinner, Table, Td, Th } from "@/components/ui";
import { MeterList, SERIES_2, StatTile } from "@/components/charts";

function useArReport<T>(load: () => Promise<T>, deps: unknown[]) {
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
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load data");
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
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <AlertTriangle size={24} className="text-status-critical" />
        <p className="text-sm font-medium text-status-critical">{error}</p>
      </div>
    );
  }
  if (loading || !data) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="sm" />
      </div>
    );
  }
  return <>{children(data)}</>;
}

export default function AccountsReceivablePage() {
  const currency = useAuthStore((s) => s.user?.store.currency) ?? "PHP";
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

  const [tab, setTab] = useState<"aging" | "overdue" | "collections">("aging");

  const overview = useArReport<CreditOverview>(() => getCreditOverview(), []);
  const aging = useArReport<CreditAgingReport>(() => getCreditAging(), []);
  const overdue = useArReport<{ accounts: OverdueAccount[]; total_overdue: number; account_count: number }>(
    () => getOverdueAccounts(),
    []
  );
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const collections = useArReport<CreditCollectionReport>(
    () => getCreditCollectionReport(yearStart.toISOString().slice(0, 10), today.toISOString().slice(0, 10)),
    []
  );

  return (
    <div className="p-6">
      <PageHeader title="Accounts Receivable" subtitle="Track what customers owe and who's overdue" />

      <ReportShell loading={overview.loading} error={overview.error} data={overview.data}>
        {(o) => (
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Total outstanding" value={money(o.total_outstanding)} icon={<Wallet size={16} />} />
            <StatTile label="Customers with balance" value={`${o.customers_with_balance} / ${o.total_customers_with_credit}`} icon={<Users size={16} />} />
            <StatTile label="Total credit limit" value={money(o.total_credit_limit)} icon={<CreditCard size={16} />} />
            <StatTile label="Avg. credit utilization" value={`${o.average_credit_utilization.toFixed(1)}%`} icon={<Percent size={16} />} />
          </div>
        )}
      </ReportShell>

      <div className="card">
        <div className="border-b border-black/[0.07] p-3">
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "aging", label: "Aging" },
              { value: "overdue", label: "Overdue" },
              { value: "collections", label: "Collections" },
            ]}
          />
        </div>

        <div className="p-4">
          {tab === "aging" && (
            <ReportShell loading={aging.loading} error={aging.error} data={aging.data}>
              {(a) => (
                <>
                  <div className="mb-4 grid grid-cols-4 gap-2 text-center">
                    <AgingStat label="Current" value={money(a.summary.current)} />
                    <AgingStat label="31-60d" value={money(a.summary.days_31_60)} />
                    <AgingStat label="61-90d" value={money(a.summary.days_61_90)} />
                    <AgingStat label=">90d" value={money(a.summary.days_over_90)} tone="critical" />
                  </div>
                  {a.customers.length === 0 ? (
                    <EmptyState icon={<Users size={24} />} title="No outstanding balances" />
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Customer</Th>
                          <Th right>Current</Th>
                          <Th right>31-60d</Th>
                          <Th right>61-90d</Th>
                          <Th right>&gt;90d</Th>
                          <Th right>Total</Th>
                          <Th right>Utilization</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {a.customers.map((row) => (
                          <tr key={row.customer.uuid} className="hover:bg-black/[0.015]">
                            <Td className="font-medium">{row.customer.name}</Td>
                            <Td right>{money(row.aging.current)}</Td>
                            <Td right>{money(row.aging.days_31_60)}</Td>
                            <Td right>{money(row.aging.days_61_90)}</Td>
                            <Td right className={cx(row.aging.days_over_90 > 0 && "font-semibold text-status-critical")}>
                              {money(row.aging.days_over_90)}
                            </Td>
                            <Td right className="font-medium">
                              {money(row.total_outstanding)}
                            </Td>
                            <Td right>{row.credit_utilization.toFixed(0)}%</Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </>
              )}
            </ReportShell>
          )}

          {tab === "overdue" && (
            <ReportShell loading={overdue.loading} error={overdue.error} data={overdue.data}>
              {(o) =>
                o.accounts.length === 0 ? (
                  <EmptyState icon={<Users size={24} />} title="No overdue receivables" hint="All customer accounts are current" />
                ) : (
                  <>
                    <div className="mb-3 rounded-lg bg-black/[0.04] px-3 py-2.5">
                      <p className="text-xs text-ink-secondary">Total overdue</p>
                      <p className="text-lg font-semibold text-status-critical">{money(o.total_overdue)}</p>
                    </div>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Customer</Th>
                          <Th right>Overdue amount</Th>
                          <Th right>Days overdue</Th>
                          <Th>Oldest due date</Th>
                          <Th right>Invoices</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {o.accounts.map((row) => (
                          <tr key={row.customer.uuid} className="hover:bg-black/[0.015]">
                            <Td className="font-medium">{row.customer.name}</Td>
                            <Td right className="font-semibold text-status-critical">
                              {money(row.overdue_amount)}
                            </Td>
                            <Td right>
                              <Badge tone="critical">{row.days_overdue}d</Badge>
                            </Td>
                            <Td className="text-ink-secondary">{formatDate(row.oldest_due_date)}</Td>
                            <Td right>{row.invoice_count}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </>
                )
              }
            </ReportShell>
          )}

          {tab === "collections" && (
            <ReportShell loading={collections.loading} error={collections.error} data={collections.data}>
              {(c) => (
                <div>
                  <div className="mb-3 rounded-lg bg-black/[0.04] px-3 py-2.5">
                    <p className="text-xs text-ink-secondary">Total collected (YTD)</p>
                    <p className="text-lg font-semibold">{money(c.summary.total_collected)}</p>
                    <p className="text-xs text-ink-muted">{c.summary.total_payments} payments</p>
                  </div>
                  {c.by_method.length === 0 ? (
                    <EmptyState icon={<Banknote size={24} />} title="No collections yet" />
                  ) : (
                    <MeterList
                      color={SERIES_2}
                      rows={c.by_method.map((m) => ({
                        label: m.payment_method,
                        value: m.total_collected,
                        display: money(m.total_collected),
                        sub: `${m.payment_count} payments`,
                      }))}
                    />
                  )}
                </div>
              )}
            </ReportShell>
          )}
        </div>
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

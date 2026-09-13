"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Banknote, CalendarClock, Landmark, Wallet } from "lucide-react";
import {
  getAPAging,
  getAPOverview,
  getDisbursementReport,
  getOverduePayables,
  getPaymentSchedule,
  type APAgingReport,
  type APOverview,
  type DisbursementReport,
  type OverduePayableAccount,
  type PaymentScheduleRow,
} from "@/lib/api/accounts-payable";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { cx, formatDate } from "@/lib/utils";
import { Badge, EmptyState, PageHeader, Segmented, Spinner, Table, Td, Th } from "@/components/ui";
import { MeterList, SERIES_2, StatTile } from "@/components/charts";

function useApReport<T>(load: () => Promise<T>, deps: unknown[]) {
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

export default function AccountsPayablePage() {
  const currency = useAuthStore((s) => s.user?.store.currency) ?? "PHP";
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

  const [scheduleDays, setScheduleDays] = useState(30);
  const [tab, setTab] = useState<"aging" | "overdue" | "schedule" | "disbursements">("aging");

  const overview = useApReport<APOverview>(() => getAPOverview(), []);
  const aging = useApReport<APAgingReport>(() => getAPAging(), []);
  const overdue = useApReport<{ accounts: OverduePayableAccount[]; total_overdue: number; account_count: number }>(
    () => getOverduePayables(),
    []
  );
  const schedule = useApReport<{ schedule: PaymentScheduleRow[]; total_due: number; count: number }>(
    () => getPaymentSchedule(scheduleDays),
    [scheduleDays]
  );
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const disbursement = useApReport<DisbursementReport>(
    () => getDisbursementReport(yearStart.toISOString().slice(0, 10), today.toISOString().slice(0, 10)),
    []
  );

  return (
    <div className="p-6">
      <PageHeader title="Accounts Payable" subtitle="Track what's owed to suppliers and when payments are due" />

      <ReportShell loading={overview.loading} error={overview.error} data={overview.data}>
        {(o) => (
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label="Total outstanding" value={money(o.total_outstanding)} icon={<Wallet size={16} />} />
            <StatTile label="Suppliers with balance" value={`${o.suppliers_with_balance} / ${o.total_suppliers}`} icon={<Landmark size={16} />} />
            <StatTile label="Total purchases (lifetime)" value={money(o.total_purchases)} icon={<Banknote size={16} />} />
            <StatTile label="Avg. payment terms" value={`${o.average_payment_terms} days`} icon={<CalendarClock size={16} />} />
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
              { value: "schedule", label: "Payment schedule" },
              { value: "disbursements", label: "Disbursements" },
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
                  {a.suppliers.length === 0 ? (
                    <EmptyState icon={<Landmark size={24} />} title="No outstanding balances" />
                  ) : (
                    <Table>
                      <thead>
                        <tr>
                          <Th>Supplier</Th>
                          <Th right>Current</Th>
                          <Th right>31-60d</Th>
                          <Th right>61-90d</Th>
                          <Th right>&gt;90d</Th>
                          <Th right>Total</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {a.suppliers.map((row) => (
                          <tr key={row.supplier.uuid} className="hover:bg-black/[0.015]">
                            <Td className="font-medium">{row.supplier.name}</Td>
                            <Td right>{money(row.aging.current)}</Td>
                            <Td right>{money(row.aging.days_31_60)}</Td>
                            <Td right>{money(row.aging.days_61_90)}</Td>
                            <Td right className={cx(row.aging.days_over_90 > 0 && "font-semibold text-status-critical")}>
                              {money(row.aging.days_over_90)}
                            </Td>
                            <Td right className="font-medium">
                              {money(row.total_outstanding)}
                            </Td>
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
                  <EmptyState icon={<Landmark size={24} />} title="No overdue payables" hint="All supplier accounts are current" />
                ) : (
                  <>
                    <div className="mb-3 rounded-lg bg-black/[0.04] px-3 py-2.5">
                      <p className="text-xs text-ink-secondary">Total overdue</p>
                      <p className="text-lg font-semibold text-status-critical">{money(o.total_overdue)}</p>
                    </div>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Supplier</Th>
                          <Th right>Overdue amount</Th>
                          <Th right>Days overdue</Th>
                          <Th>Oldest due date</Th>
                          <Th right>Invoices</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {o.accounts.map((row) => (
                          <tr key={row.supplier.uuid} className="hover:bg-black/[0.015]">
                            <Td className="font-medium">{row.supplier.name}</Td>
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

          {tab === "schedule" && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Upcoming payments</h3>
                <Segmented
                  value={scheduleDays.toString()}
                  onChange={(v) => setScheduleDays(parseInt(v, 10))}
                  options={[
                    { value: "7", label: "7d" },
                    { value: "30", label: "30d" },
                    { value: "90", label: "90d" },
                  ]}
                />
              </div>
              <ReportShell loading={schedule.loading} error={schedule.error} data={schedule.data}>
                {(s) =>
                  s.schedule.length === 0 ? (
                    <EmptyState icon={<CalendarClock size={24} />} title="No payments due in this window" />
                  ) : (
                    <>
                      <div className="mb-3 rounded-lg bg-black/[0.04] px-3 py-2.5">
                        <p className="text-xs text-ink-secondary">Total due</p>
                        <p className="text-lg font-semibold">{money(s.total_due)}</p>
                      </div>
                      <Table>
                        <thead>
                          <tr>
                            <Th>Supplier</Th>
                            <Th>PO</Th>
                            <Th>Due date</Th>
                            <Th right>Days until due</Th>
                            <Th right>Amount due</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.schedule.map((row, i) => (
                            <tr key={i} className="hover:bg-black/[0.015]">
                              <Td className="font-medium">{row.supplier.name}</Td>
                              <Td className="font-mono text-xs">{row.purchase_order.po_number}</Td>
                              <Td className="text-ink-secondary">{formatDate(row.due_date)}</Td>
                              <Td right>
                                <span className={cx(row.days_until_due <= 7 && "font-semibold text-status-warning")}>{row.days_until_due}</span>
                              </Td>
                              <Td right className="font-medium">
                                {money(row.amount_due)}
                              </Td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </>
                  )
                }
              </ReportShell>
            </div>
          )}

          {tab === "disbursements" && (
            <ReportShell loading={disbursement.loading} error={disbursement.error} data={disbursement.data}>
              {(d) => (
                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <div className="mb-3 rounded-lg bg-black/[0.04] px-3 py-2.5">
                      <p className="text-xs text-ink-secondary">Total disbursed (YTD)</p>
                      <p className="text-lg font-semibold">{money(d.summary.total_disbursed)}</p>
                      <p className="text-xs text-ink-muted">{d.summary.total_payments} payments</p>
                    </div>
                    {d.by_method.length === 0 ? (
                      <EmptyState icon={<Banknote size={24} />} title="No disbursements yet" />
                    ) : (
                      <MeterList
                        color={SERIES_2}
                        rows={d.by_method.map((m) => ({
                          label: m.payment_method,
                          value: m.total_disbursed,
                          display: money(m.total_disbursed),
                          sub: `${m.payment_count} payments`,
                        }))}
                      />
                    )}
                  </div>
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Recent daily disbursements</h3>
                    {d.daily_disbursements.length === 0 ? (
                      <EmptyState icon={<CalendarClock size={24} />} title="No recent activity" />
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {d.daily_disbursements.slice(0, 10).map((row, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg border border-black/[0.06] px-3 py-2 text-sm">
                            <span>
                              {formatDate(row.date)} <span className="ml-1 text-xs capitalize text-ink-muted">{row.payment_method}</span>
                            </span>
                            <span className="tabular font-medium">{money(row.total_disbursed)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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

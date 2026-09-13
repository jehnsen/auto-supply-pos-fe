"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardCheck,
  Clock,
  DoorClosed,
  DoorOpen,
  Printer,
  Receipt,
  Scale,
  Wallet,
} from "lucide-react";
import {
  closeShift,
  getCurrentShift,
  getShift,
  getXReading,
  listShifts,
  openShift,
  parseMoney,
  type Shift,
  type ShiftSalesSummary,
  type XReading,
} from "@/lib/api/shifts";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { cx, formatDateTime, formatMoney } from "@/lib/utils";
import { Badge, Button, EmptyState, Field, Input, Modal, PageHeader, Segmented, Spinner, Table, Td, Textarea, Th } from "@/components/ui";
import { StatTile } from "@/components/charts";

const SHIFT_NOTE_TAGS = ["Morning shift", "Evening shift", "Whole day"];

function useMoney() {
  const currency = useAuthStore((s) => s.user?.store.currency) ?? "PHP";
  return (n: number) => formatMoney(n, currency);
}

export default function ShiftsPage() {
  const money = useMoney();
  const [tab, setTab] = useState<"current" | "history">("current");

  const [current, setCurrent] = useState<Shift | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [openModal, setOpenModal] = useState(false);
  const [closeModal, setCloseModal] = useState(false);
  const [reading, setReading] = useState<XReading | null>(null);
  const [readingModal, setReadingModal] = useState(false);
  const [zReport, setZReport] = useState<Shift | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoadingCurrent(true);
      setError(null);
      try {
        const s = await getCurrentShift();
        if (!cancelled) setCurrent(s);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load shift");
      } finally {
        if (!cancelled) setLoadingCurrent(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleViewXReading() {
    if (!current) return;
    setError(null);
    try {
      const r = await getXReading(current.uuid);
      setReading(r);
      setReadingModal(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load X-reading");
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Shifts"
        subtitle="Open and close cash-drawer sessions, run X-readings, and review Z-readings"
        actions={
          !loadingCurrent &&
          (current ? (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleViewXReading}>
                <Receipt size={15} /> X-Reading
              </Button>
              <Button variant="danger" onClick={() => setCloseModal(true)}>
                <DoorClosed size={15} /> Close shift
              </Button>
            </div>
          ) : (
            <Button onClick={() => setOpenModal(true)}>
              <DoorOpen size={15} /> Open shift
            </Button>
          ))
        }
      />

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm font-medium text-status-critical">
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      <div className="mb-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "current", label: "Current shift" },
            { value: "history", label: "History" },
          ]}
        />
      </div>

      {tab === "current" && (
        <CurrentShiftPanel loading={loadingCurrent} shift={current} money={money} onOpen={() => setOpenModal(true)} />
      )}

      {tab === "history" && <HistoryPanel money={money} onViewZReading={setZReport} />}

      {openModal && (
        <OpenShiftModal
          onClose={() => setOpenModal(false)}
          onOpened={(s) => {
            setCurrent(s);
            setOpenModal(false);
          }}
        />
      )}

      {current && closeModal && (
        <CloseShiftModal
          shift={current}
          money={money}
          onClose={() => setCloseModal(false)}
          onClosed={(z) => {
            setCloseModal(false);
            setCurrent(null);
            setZReport(z);
          }}
        />
      )}

      <XReadingModal open={readingModal} reading={reading} money={money} onClose={() => setReadingModal(false)} />

      <ZReadingModal report={zReport} money={money} onClose={() => setZReport(null)} />
    </div>
  );
}

/* ---------- Current shift ---------- */

function CurrentShiftPanel({
  loading,
  shift,
  money,
  onOpen,
}: {
  loading: boolean;
  shift: Shift | null;
  money: (n: number) => string;
  onOpen: () => void;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="sm" />
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="card py-4">
        <EmptyState
          icon={<DoorOpen size={26} />}
          title="No open shift"
          hint="Open a shift to declare your starting cash float and begin selling."
        />
        <div className="flex justify-center pb-6">
          <Button onClick={onOpen}>
            <DoorOpen size={15} /> Open shift
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[0.3rem] bg-brand-soft text-brand-strong">
            <ClipboardCheck size={20} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-mono text-sm font-semibold">{shift.shift_number}</p>
              <Badge tone="good">Open</Badge>
            </div>
            <p className="text-xs text-ink-secondary">
              {shift.user?.name ?? "—"}
              {shift.branch?.name ? ` · ${shift.branch.name}` : ""}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1 text-xs text-ink-muted">
            <Clock size={13} /> Opened
          </p>
          <p className="text-sm font-medium">{formatDateTime(shift.opened_at)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Opening cash float" value={money(parseMoney(shift.opening_cash))} icon={<Wallet size={16} />} />
        <StatTile label="Cashier" value={shift.user?.name ?? "—"} icon={<ClipboardCheck size={16} />} />
        <StatTile label="Branch" value={shift.branch?.name ?? "—"} icon={<Receipt size={16} />} />
        <StatTile label="Status" value="Selling" icon={<DoorOpen size={16} />} />
      </div>

      {shift.opening_notes && (
        <div className="card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Opening notes</p>
          <p className="mt-1 text-sm text-ink-secondary">{shift.opening_notes}</p>
        </div>
      )}
    </div>
  );
}

/* ---------- Sales summary block (shared by X- and Z-reading) ---------- */

function SalesSummaryGrid({ summary, money }: { summary: ShiftSalesSummary; money: (n: number) => string }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <SummaryCell label="Gross sales" value={money(parseMoney(summary.gross_sales))} strong />
      <SummaryCell label="Discounts" value={money(parseMoney(summary.total_discounts))} />
      <SummaryCell label="VAT" value={money(parseMoney(summary.total_vat))} />
      <SummaryCell label="Cash sales" value={money(parseMoney(summary.cash_sales_total))} />
      <SummaryCell label="Transactions" value={String(summary.transaction_count)} />
      <SummaryCell label="Completed" value={String(summary.completed_count)} />
      <SummaryCell label="Voided" value={String(summary.voided_count)} />
      <SummaryCell label="Refunded" value={String(summary.refunded_count)} />
    </div>
  );
}

function SummaryCell({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg bg-black/[0.04] px-3 py-2">
      <p className="text-[11px] text-ink-secondary">{label}</p>
      <p className={cx("tabular", strong ? "text-base font-semibold" : "text-sm font-medium")}>{value}</p>
    </div>
  );
}

function PaymentMethodTable({ summary, money }: { summary: ShiftSalesSummary; money: (n: number) => string }) {
  if (!summary.payment_methods.length) return null;
  return (
    <Table>
      <thead>
        <tr>
          <Th>Payment method</Th>
          <Th right>Transactions</Th>
          <Th right>Amount</Th>
        </tr>
      </thead>
      <tbody>
        {summary.payment_methods.map((m) => (
          <tr key={m.method} className="hover:bg-black/[0.015]">
            <Td className="font-medium capitalize">{m.method}</Td>
            <Td right>{m.transaction_count}</Td>
            <Td right className="font-medium">
              {money(parseMoney(m.total_amount))}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

/* ---------- Open shift modal ---------- */

function OpenShiftModal({
  onClose,
  onOpened,
}: {
  onClose: () => void;
  onOpened: (shift: Shift) => void;
}) {
  const [openingCash, setOpeningCash] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    const amount = Number(openingCash);
    if (!Number.isFinite(amount) || amount < 0) {
      setErr("Enter a valid opening cash amount");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const shift = await openShift(amount, notes);
      onOpened(shift);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to open shift");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Open shift"
      width="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            <DoorOpen size={15} /> {submitting ? "Opening…" : "Open shift"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-secondary">
          Declare the cash float in the drawer at the start of your shift.
        </p>
        <Field label="Opening cash float">
          <Input
            type="number"
            min="0"
            step="0.01"
            autoFocus
            value={openingCash}
            onChange={(e) => setOpeningCash(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Field label="Notes (optional)">
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {SHIFT_NOTE_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setNotes((prev) => (prev === tag ? "" : tag))}
                className={cx(
                  "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer",
                  notes === tag
                    ? "border-brand bg-brand-soft text-brand-strong"
                    : "border-black/10 text-ink-secondary hover:bg-black/[0.03]"
                )}
              >
                {tag}
              </button>
            ))}
          </div>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Morning shift" />
        </Field>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{err}</p>}
      </div>
    </Modal>
  );
}

/* ---------- Close shift modal ---------- */

function CloseShiftModal({
  shift,
  money,
  onClose,
  onClosed,
}: {
  shift: Shift;
  money: (n: number) => string;
  onClose: () => void;
  onClosed: (z: Shift) => void;
}) {
  const [closingCash, setClosingCash] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    const amount = Number(closingCash);
    if (!Number.isFinite(amount) || amount < 0) {
      setErr("Enter the counted closing cash amount");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const z = await closeShift(shift.uuid, amount, notes);
      onClosed(z);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to close shift");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Close shift · ${shift.shift_number}`}
      width="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={submit} disabled={submitting}>
            <DoorClosed size={15} /> {submitting ? "Closing…" : "Close & generate Z-reading"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-lg bg-black/[0.04] px-3 py-2.5">
          <p className="text-xs text-ink-secondary">Opening cash float</p>
          <p className="tabular text-sm font-semibold">{money(parseMoney(shift.opening_cash))}</p>
        </div>
        <p className="text-sm text-ink-secondary">
          Count the cash in the drawer and enter the total. The system compares it against expected cash and records any
          variance.
        </p>
        <Field label="Counted closing cash">
          <Input
            type="number"
            min="0"
            step="0.01"
            autoFocus
            value={closingCash}
            onChange={(e) => setClosingCash(e.target.value)}
            placeholder="0.00"
          />
        </Field>
        <Field label="Notes (optional)">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. reason for any over/short"
          />
        </Field>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{err}</p>}
      </div>
    </Modal>
  );
}

/* ---------- X-Reading modal ---------- */

function XReadingModal({
  open,
  reading,
  money,
  onClose,
}: {
  open: boolean;
  reading: XReading | null;
  money: (n: number) => string;
  onClose: () => void;
}) {
  if (!reading) return null;
  return (
    <Modal open={open} onClose={onClose} title="X-Reading (interim)" width="max-w-lg">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-sm font-semibold">{reading.shift.shift_number}</p>
            <p className="text-xs text-ink-secondary">
              {reading.shift.user?.name ? `${reading.shift.user.name} · ` : ""}Opened {formatDateTime(reading.shift.opened_at)}
            </p>
          </div>
          <Badge tone="brand">Drawer still open</Badge>
        </div>
        <SalesSummaryGrid summary={reading.reading} money={money} />
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">By payment method</p>
          <PaymentMethodTable summary={reading.reading} money={money} />
        </div>
        <p className="text-xs text-ink-muted">
          An X-reading is a running snapshot. It does not close the drawer and can be run any number of times.
        </p>
      </div>
    </Modal>
  );
}

/* ---------- Z-Reading modal ---------- */

function ZReadingModal({ report, money, onClose }: { report: Shift | null; money: (n: number) => string; onClose: () => void }) {
  const storeName = useAuthStore((s) => s.user?.store.name) ?? "";
  if (!report) return null;
  const variance = parseMoney(report.cash_variance);
  const summary = report.sales_summary;

  return (
    <Modal
      open={!!report}
      onClose={onClose}
      title={`Z-Reading · ${report.shift_number}`}
      width="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={15} /> Print
          </Button>
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-ink-secondary">
              {report.user?.name ?? "—"}
              {report.branch?.name ? ` · ${report.branch.name}` : ""}
            </p>
            <p className="text-xs text-ink-muted">
              {formatDateTime(report.opened_at)} → {report.closed_at ? formatDateTime(report.closed_at) : "—"}
            </p>
          </div>
          <Badge tone="neutral">Closed</Badge>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <CashCell icon={<ArrowUpCircle size={15} />} label="Opening" value={money(parseMoney(report.opening_cash))} />
          <CashCell icon={<Wallet size={15} />} label="Expected" value={money(parseMoney(report.expected_cash))} />
          <CashCell icon={<ArrowDownCircle size={15} />} label="Counted" value={money(parseMoney(report.closing_cash))} />
        </div>

        <div
          className={cx(
            "flex items-center justify-between rounded-lg px-3 py-2.5",
            variance === 0 ? "bg-emerald-50" : "bg-red-50"
          )}
        >
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <Scale size={15} /> Cash variance
          </span>
          <span className={cx("tabular text-base font-semibold", variance === 0 ? "text-emerald-700" : "text-status-critical")}>
            {variance > 0 ? "+" : ""}
            {money(variance)} {variance === 0 ? "(balanced)" : variance < 0 ? "(short)" : "(over)"}
          </span>
        </div>

        {summary && (
          <>
            <SalesSummaryGrid summary={summary} money={money} />
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">By payment method</p>
              <PaymentMethodTable summary={summary} money={money} />
            </div>
          </>
        )}

        {report.closing_notes && (
          <div className="rounded-lg bg-black/[0.04] px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Closing notes</p>
            <p className="text-sm text-ink-secondary">{report.closing_notes}</p>
          </div>
        )}
      </div>

      {/* Print-only thermal Z-reading. Global print CSS reveals only #receipt-print. */}
      <ZReadingReceipt report={report} storeName={storeName} money={money} />
    </Modal>
  );
}

function ZReadingReceipt({ report, storeName, money }: { report: Shift; storeName: string; money: (n: number) => string }) {
  const summary = report.sales_summary;
  const variance = parseMoney(report.cash_variance);
  const rule = <div className="my-2 border-t border-dashed border-black/60" />;
  const line = (label: string, value: string, bold?: boolean) => (
    <div className={cx("flex justify-between", bold && "font-bold")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <div
      id="receipt-print"
      className="mx-auto hidden w-full max-w-[300px] bg-white font-mono text-[11.5px] leading-relaxed text-black print:block"
    >
      <div className="text-center">
        {storeName && <p className="text-sm font-bold tracking-wide">{storeName.toUpperCase()}</p>}
        {report.branch?.name && <p>{report.branch.name}</p>}
        <p className="mt-1 font-bold">Z-READING</p>
      </div>
      {rule}
      {line("Shift #", report.shift_number)}
      {line("Cashier", report.user?.name ?? "—")}
      {line("Opened", formatDateTime(report.opened_at))}
      {line("Closed", report.closed_at ? formatDateTime(report.closed_at) : "—")}
      {rule}
      {line("Opening cash", money(parseMoney(report.opening_cash)))}
      {line("Expected cash", money(parseMoney(report.expected_cash)))}
      {line("Counted cash", money(parseMoney(report.closing_cash)))}
      {line("Variance", `${variance > 0 ? "+" : ""}${money(variance)}`, true)}
      {summary && (
        <>
          {rule}
          {line("Gross sales", money(parseMoney(summary.gross_sales)), true)}
          {line("Discounts", money(parseMoney(summary.total_discounts)))}
          {line("VAT", money(parseMoney(summary.total_vat)))}
          {line("Cash sales", money(parseMoney(summary.cash_sales_total)))}
          {rule}
          {line("Transactions", String(summary.transaction_count))}
          {line("Completed", String(summary.completed_count))}
          {line("Voided", String(summary.voided_count))}
          {line("Refunded", String(summary.refunded_count))}
          {summary.payment_methods.length > 0 && (
            <>
              {rule}
              <p className="font-bold">BY PAYMENT METHOD</p>
              {summary.payment_methods.map((m) => (
                <div key={m.method} className="flex justify-between">
                  <span className="capitalize">
                    {m.method} ({m.transaction_count})
                  </span>
                  <span>{money(parseMoney(m.total_amount))}</span>
                </div>
              ))}
            </>
          )}
        </>
      )}
      {report.closing_notes && (
        <>
          {rule}
          <p className="font-bold">Notes</p>
          <p>{report.closing_notes}</p>
        </>
      )}
      {rule}
      <p className="text-center">*** END OF Z-READING ***</p>
    </div>
  );
}

function CashCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/[0.07] px-3 py-2">
      <p className="flex items-center gap-1 text-[11px] text-ink-muted">
        {icon} {label}
      </p>
      <p className="tabular text-sm font-semibold">{value}</p>
    </div>
  );
}

/* ---------- History ---------- */

function HistoryPanel({ money, onViewZReading }: { money: (n: number) => string; onViewZReading: (s: Shift) => void }) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "closed">("all");

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await listShifts({
          page,
          per_page: 15,
          status: statusFilter === "all" ? undefined : statusFilter,
        });
        if (!cancelled) {
          setShifts(res.data ?? []);
          setLastPage(res.meta?.last_page ?? 1);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load shift history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter]);

  async function openZReading(uuid: string) {
    try {
      onViewZReading(await getShift(uuid));
    } catch {
      /* surfaced via disabled UX; keep simple */
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-black/[0.07] p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Shift history</h3>
        <Segmented
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          options={[
            { value: "all", label: "All" },
            { value: "open", label: "Open" },
            { value: "closed", label: "Closed" },
          ]}
        />
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <AlertTriangle size={22} className="text-status-critical" />
          <p className="text-sm font-medium text-status-critical">{error}</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="sm" />
        </div>
      ) : shifts.length === 0 ? (
        <EmptyState icon={<ClipboardCheck size={24} />} title="No shifts found" hint="Closed shifts and their Z-readings appear here." />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Shift #</Th>
                <Th>Cashier</Th>
                <Th>Status</Th>
                <Th>Opened</Th>
                <Th>Closed</Th>
                <Th right>Gross sales</Th>
                <Th right>Variance</Th>
                <Th right>Z-Reading</Th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => {
                const variance = parseMoney(s.cash_variance);
                return (
                  <tr key={s.uuid} className="hover:bg-black/[0.015]">
                    <Td className="font-mono text-xs font-medium">{s.shift_number}</Td>
                    <Td>{s.user?.name ?? "—"}</Td>
                    <Td>
                      <Badge tone={s.status === "open" ? "good" : "neutral"}>{s.status}</Badge>
                    </Td>
                    <Td className="text-ink-secondary">{formatDateTime(s.opened_at)}</Td>
                    <Td className="text-ink-secondary">{s.closed_at ? formatDateTime(s.closed_at) : "—"}</Td>
                    <Td right className="font-medium">
                      {s.sales_summary ? money(parseMoney(s.sales_summary.gross_sales)) : "—"}
                    </Td>
                    <Td right>
                      {s.cash_variance == null ? (
                        "—"
                      ) : (
                        <span className={cx("tabular font-medium", variance !== 0 && "text-status-critical")}>
                          {variance > 0 ? "+" : ""}
                          {money(variance)}
                        </span>
                      )}
                    </Td>
                    <Td right>
                      {s.status === "closed" ? (
                        <Button size="sm" variant="secondary" onClick={() => openZReading(s.uuid)}>
                          <Receipt size={13} /> View
                        </Button>
                      ) : (
                        <span className="text-xs text-ink-muted">—</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          {lastPage > 1 && (
            <div className="flex items-center justify-between border-t border-black/[0.07] px-4 py-3">
              <p className="text-xs text-ink-muted">
                Page {page} of {lastPage}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button size="sm" variant="secondary" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

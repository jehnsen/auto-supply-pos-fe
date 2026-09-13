"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardPlus,
  Columns3,
  DoorOpen,
  MessageSquareWarning,
  PackageCheck,
  PackageX,
  ScanLine,
  TriangleAlert,
} from "lucide-react";
import {
  BOARD_STAGES,
  daysUntilPromise,
  isOpenStatus,
  listTickets,
  promiseLabel,
  stageOf,
  type ServiceTicket,
} from "@/lib/api/service-tickets";
import { getCurrentShift, type Shift } from "@/lib/api/shifts";
import { useAuthStore } from "@/lib/auth-store";
import { CounterHeader } from "@/components/CounterHeader";
import { Caption, Lamp, Panel } from "@/components/panel";
import { Button, EmptyState, Spinner } from "@/components/ui";
import { cx } from "@/lib/utils";

export default function DaySheetPage() {
  const user = useAuthStore((s) => s.user);
  const currency = user?.store.currency ?? "PHP";
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [shift, setShift] = useState<Shift | null>(null);
  const [shiftChecked, setShiftChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listTickets()
      .then((rows) => {
        if (!cancelled) {
          setTickets(rows);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The shift lives on the API; a backend outage must not blank the whole day sheet.
  useEffect(() => {
    let cancelled = false;
    getCurrentShift()
      .then((s) => {
        if (!cancelled) {
          setShift(s);
          setShiftChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) setShiftChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => {
    const open = tickets.filter((t) => isOpenStatus(t.status));
    return {
      open,
      overdue: open.filter((t) => (daysUntilPromise(t.promised_at) ?? 1) < 0),
      dueToday: open.filter((t) => daysUntilPromise(t.promised_at) === 0),
      ready: open.filter((t) => t.status === "ready_for_release"),
      awaitingApproval: open.filter((t) => t.status === "awaiting_approval"),
    };
  }, [tickets]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <CounterHeader
        title="Dashboard"
        subtitle=""
        actions={
          <>
            <Link href="/service-tickets/intake" prefetch={false}>
              <Button>
                <ClipboardPlus size={15} /> New job order
              </Button>
            </Link>
            <Link href="/pos" prefetch={false}>
              <Button variant="secondary">
                <ScanLine size={15} /> Point of sale
              </Button>
            </Link>
          </>
        }
      />

      {/* The one thing that blocks selling, surfaced before anything else. */}
      {shiftChecked && !shift && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5">
          <p className="flex items-center gap-2 text-sm text-amber-900">
            {/* A lit warning lamp, the way a dash tells you something needs attention. */}
            <Lamp tone="warning" />
            <DoorOpen size={16} />
            <span>
              <span className="font-semibold">No shift is open.</span> Count the starting cash before ringing up a sale.
            </span>
          </p>
          <Link href="/shifts" prefetch={false}>
            <Button size="sm" variant="secondary">
              Open the drawer
            </Button>
          </Link>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          label="Overdue"
          value={groups.overdue.length}
          hint="past the promised date"
          icon={<TriangleAlert size={15} />}
          tone={groups.overdue.length > 0 ? "critical" : "neutral"}
        />
        <StatTile
          label="Due today"
          value={groups.dueToday.length}
          hint="promised before closing"
          icon={<Columns3 size={15} />}
          tone={groups.dueToday.length > 0 ? "warning" : "neutral"}
        />
        <StatTile
          label="Ready for pickup"
          value={groups.ready.length}
          hint="waiting at the counter"
          icon={<PackageCheck size={15} />}
          tone={groups.ready.length > 0 ? "good" : "neutral"}
        />
        <StatTile
          label="Awaiting approval"
          value={groups.awaitingApproval.length}
          hint="customer has not replied"
          icon={<MessageSquareWarning size={15} />}
          tone={groups.awaitingApproval.length > 0 ? "warning" : "neutral"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <Panel
            label="Overdue"
            actions={<span className="tabular text-xs text-ink-muted">{groups.overdue.length}</span>}
            bodyClassName="p-0"
          >
            {groups.overdue.length === 0 ? (
              <EmptyState
                icon={<PackageCheck size={26} />}
                title="Nothing is overdue."
                hint="Every open job is still inside its promised date."
              />
            ) : (
              <JobList tickets={groups.overdue} money={money} />
            )}
          </Panel>

          <Panel
            label="Waiting on the customer"
            actions={<span className="tabular text-xs text-ink-muted">{groups.awaitingApproval.length}</span>}
            bodyClassName="p-0"
          >
            {groups.awaitingApproval.length === 0 ? (
              <EmptyState
                icon={<MessageSquareWarning size={26} />}
                title="No quotes are pending."
                hint="Jobs whose quote has been sent but not answered land here."
              />
            ) : (
              <JobList tickets={groups.awaitingApproval} money={money} />
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel
            label="Ready for pickup"
            actions={
              <Link
                href="/service-tickets/release"
                prefetch={false}
                className="flex items-center gap-1 text-xs font-medium text-brand-strong hover:underline"
              >
                Release <ArrowRight size={12} />
              </Link>
            }
            bodyClassName="p-0"
          >
            {groups.ready.length === 0 ? (
              <EmptyState icon={<PackageCheck size={24} />} title="Nothing waiting." />
            ) : (
              <JobList tickets={groups.ready} money={money} compact />
            )}
          </Panel>

          {/* Board at a glance: where every open job currently sits. */}
          <Panel
            label="Board at a glance"
            actions={<span className="text-xs text-ink-muted">{groups.open.length} open</span>}
          >
            <div className="flex flex-col gap-2">
              {BOARD_STAGES.map((stage) => {
                const count = groups.open.filter((t) => stageOf(t.status) === stage.id).length;
                const pct = groups.open.length > 0 ? (count / groups.open.length) * 100 : 0;
                return (
                  <div key={stage.id} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 truncate text-[13px] text-ink-secondary">{stage.title}</span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/[0.06]">
                      <span
                        className="block h-full rounded-full transition-[width] duration-300"
                        style={{ width: `${Math.max(pct, count > 0 ? 6 : 0)}%`, background: stage.accent }}
                      />
                    </span>
                    <span className="tabular w-5 shrink-0 text-right text-xs font-semibold text-ink-muted">{count}</span>
                  </div>
                );
              })}
            </div>
            <Link
              href="/service-tickets"
              prefetch={false}
              className="mt-3 flex items-center justify-center gap-1 rounded-lg border border-black/10 py-1.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-black/[0.03] hover:text-ink"
            >
              Open the board <ArrowRight size={12} />
            </Link>
          </Panel>

          <LowStock />
        </div>
      </div>
    </div>
  );
}

/** Loads its own count so a slow inventory call never delays the job groups above. */
function LowStock() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("@/lib/api/reports")
      .then((m) => m.getLowStockReport())
      .then((res) => {
        if (!cancelled) setCount(res.count);
      })
      .catch(() => {
        if (!cancelled) setCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (count === null) return null;

  return (
    <Panel label="Parts running low">
      {count === 0 ? (
        <p className="text-sm text-ink-muted">Everything is above its reorder point.</p>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm">
            <PackageX size={15} className="text-status-warning" />
            <span>
              <span className="tabular font-semibold">{count}</span> item{count === 1 ? "" : "s"} at or below reorder
            </span>
          </p>
          <Link
            href="/inventory"
            prefetch={false}
            className="flex shrink-0 items-center gap-1 text-xs font-medium text-brand-strong hover:underline"
          >
            Inventory <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </Panel>
  );
}

type Tone = "neutral" | "good" | "warning" | "critical";

const TONE_INK: Record<Tone, string> = {
  neutral: "text-ink",
  good: "text-status-good",
  warning: "text-status-warning",
  critical: "text-status-critical",
};

function StatTile({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ReactNode;
  tone: Tone;
}) {
  return (
    <Panel>
      <div className="flex items-center gap-2 text-ink-muted">
        {icon}
        <Caption>{label}</Caption>
      </div>
      <p className={cx("tabular mt-1.5 text-4xl font-semibold tracking-tight", TONE_INK[tone])}>{value}</p>
      <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>
    </Panel>
  );
}

function JobList({
  tickets,
  money,
  compact,
}: {
  tickets: ServiceTicket[];
  money: (n: number) => string;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-col divide-y divide-black/[0.06]">
      {tickets.map((t) => {
        const promise = promiseLabel(t.promised_at);
        const owed = Math.max(0, t.estimate - t.paid);
        return (
          <Link
            key={t.uuid}
            href={`/service-tickets/ticket?id=${t.uuid}`}
            prefetch={false}
            className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-black/[0.02]"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{t.customer_name}</p>
              <p className="truncate font-mono text-[11px] text-ink-muted">{t.ticket_number}</p>
              {!compact && <p className="truncate text-xs text-ink-secondary">{t.vehicle_label}</p>}
            </div>
            <div className="shrink-0 text-right">
              {promise && (
                <p className={cx("text-[11px] font-medium", promise.late ? "text-status-critical" : "text-ink-muted")}>
                  {promise.text}
                </p>
              )}
              {owed > 0 && <p className="tabular text-[11px] font-semibold text-status-critical">{money(owed)}</p>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

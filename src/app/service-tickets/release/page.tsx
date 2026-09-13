"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck, ScanLine, X } from "lucide-react";
import {
  balanceDue,
  findTicketByCode,
  releaseTicket,
  TICKET_STATUS_LABELS,
  ticketTotal,
  type ServiceTicket,
} from "@/lib/api/service-tickets";
import { useAuthStore } from "@/lib/auth-store";
import { CounterHeader } from "@/components/CounterHeader";
import { Caption, Chip, DataRow, Panel } from "@/components/panel";
import { Button, Field, Input, Spinner, Textarea } from "@/components/ui";
import { cx, formatDate } from "@/lib/utils";

const PAYMENT_METHODS = ["Cash", "GCash", "Maya", "Card", "Bank transfer"];

export default function ReleasePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const currency = user?.store.currency ?? "PHP";
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState<ServiceTicket | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [claimedBy, setClaimedBy] = useState("");
  const [odometerOut, setOdometerOut] = useState("");
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [notes, setNotes] = useState("");
  const [releasing, setReleasing] = useState(false);

  async function find() {
    if (!code.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const found = await findTicketByCode(code);
      if (!found) {
        setTicket(null);
        setError("No job order matches that number or claim code.");
        return;
      }
      setTicket(found);
      setClaimedBy("");
      setOdometerOut("");
      setNotes("");
    } finally {
      setSearching(false);
    }
  }

  function clear() {
    setCode("");
    setTicket(null);
    setError(null);
  }

  async function release() {
    if (!ticket) return;
    setReleasing(true);
    setError(null);
    try {
      await releaseTicket(
        ticket.uuid,
        {
          received_by: claimedBy,
          odometer_out: odometerOut.trim() ? Number(odometerOut) : null,
          notes: notes.trim() || null,
          collected: balance,
          payment_method: balance > 0 ? method : undefined,
        },
        { uuid: user?.uuid ?? null, name: user?.name ?? "Staff" }
      );
      router.push(`/service-tickets/${ticket.uuid}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not release the vehicle");
      setReleasing(false);
    }
  }

  const balance = ticket ? balanceDue(ticket) : 0;
  const totalDue = ticket ? ticket.estimate + ticketTotal(ticket) : 0;
  const notReady = ticket ? ticket.status !== "ready_for_release" : false;
  const canRelease = !!ticket && !!claimedBy.trim() && !releasing && !notReady;

  return (
    <div className="p-6">
      <CounterHeader
        title="Release"
        subtitle="Scan or type the claim code, verify the claimant and the unit, collect any balance, then release."
      />

      <Panel className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-64 flex-1">
            <ScanLine size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && find()}
              placeholder="JO-IMMS-202609-0001 or YBBV-BP"
              className="pl-9 font-mono"
            />
          </div>
          <Button onClick={find} disabled={!code.trim() || searching}>
            {searching ? "Finding…" : "Find job order"}
          </Button>
          {(ticket || error) && (
            <Button variant="ghost" onClick={clear}>
              <X size={14} /> Clear
            </Button>
          )}
        </div>
        {error && <p className="mt-2 text-sm font-medium text-status-critical">{error}</p>}
      </Panel>

      {searching && !ticket && (
        <div className="flex justify-center py-14">
          <Spinner size="md" />
        </div>
      )}

      {ticket && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
          {/* ---- Left: what to check against the unit in hand ---- */}
          <div className="flex min-w-0 flex-col gap-4">
            <Panel>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Caption>Job order no.</Caption>
                  <p className="font-mono text-lg font-semibold tracking-tight">{ticket.ticket_number}</p>
                </div>
                <div>
                  <Caption>Claim code</Caption>
                  <p className="rounded bg-brand-soft px-2 py-0.5 font-mono text-lg font-semibold tracking-[0.2em] text-brand-strong">
                    {ticket.claim_code}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold">{ticket.customer_name}</p>
              <p className="font-mono text-xs text-ink-secondary">{ticket.vehicle_label}</p>

              <div className="mt-3 grid grid-cols-2 gap-4 border-t border-black/[0.07] pt-3 sm:grid-cols-4">
                <div>
                  <Caption>Stage</Caption>
                  <p className="text-sm">{TICKET_STATUS_LABELS[ticket.status]}</p>
                </div>
                <div>
                  <Caption>Promised</Caption>
                  <p className="text-sm">{ticket.promised_at ? formatDate(ticket.promised_at) : "—"}</p>
                </div>
                <div>
                  <Caption>Balance</Caption>
                  <p className={cx("tabular text-sm font-semibold", balance > 0 && "text-status-critical")}>
                    {money(balance)}
                  </p>
                </div>
                <div>
                  <Caption>Warranty</Caption>
                  <p className="text-sm">{ticket.warranty_days > 0 ? `${ticket.warranty_days} days` : "None"}</p>
                </div>
              </div>
            </Panel>

            {notReady && (
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
                This job is <strong>{TICKET_STATUS_LABELS[ticket.status]}</strong>, not ready to claim. Finish the work and
                move it to <strong>Ready for release</strong> before handing the unit over.
              </p>
            )}

            <Panel label="Condition at intake">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Caption className="mb-1.5">Turned over with the unit</Caption>
                  <div className="flex flex-wrap gap-1.5">
                    {ticket.property.length === 0 ? (
                      <span className="text-sm text-ink-muted">Nothing held.</span>
                    ) : (
                      ticket.property.map((p) => <Chip key={p.uuid}>{p.label}</Chip>)
                    )}
                  </div>
                </div>
                <div>
                  <Caption className="mb-1.5">Damage noted</Caption>
                  <div className="flex flex-wrap gap-1.5">
                    {ticket.condition_notes.length === 0 ? (
                      <span className="text-sm text-ink-muted">None recorded.</span>
                    ) : (
                      ticket.condition_notes.map((c) => <Chip key={c}>{c}</Chip>)
                    )}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                Compare this against the unit in hand before releasing it. Anything new — a fresh scratch, a missing spare
                — goes in a note on the job order, not here.
              </p>
            </Panel>

            <Panel label="Reported problem">
              <p className="text-sm">{ticket.complaint || "—"}</p>
              {ticket.diagnosis && (
                <>
                  <Caption className="mb-1 mt-3">Findings</Caption>
                  <p className="text-sm text-ink-secondary">{ticket.diagnosis}</p>
                </>
              )}
            </Panel>
          </div>

          {/* ---- Right: the release itself ---- */}
          <div className="xl:sticky xl:top-6 xl:self-start">
            <Panel label="Release">
              <Field label="Claimed by">
                <Input
                  value={claimedBy}
                  onChange={(e) => setClaimedBy(e.target.value)}
                  placeholder={ticket.customer_name}
                />
              </Field>
              <button
                type="button"
                onClick={() => setClaimedBy(ticket.customer_name)}
                className="mt-1.5 text-xs font-medium text-brand-strong hover:underline cursor-pointer"
              >
                Use {ticket.customer_name}
              </button>

              <Field label="Odometer out (km)" className="mt-3">
                <Input
                  type="number"
                  min={0}
                  value={odometerOut}
                  onChange={(e) => setOdometerOut(e.target.value)}
                  placeholder={ticket.odometer_in ? String(ticket.odometer_in) : "—"}
                />
              </Field>

              <div className="mt-4 border-t border-black/[0.07] pt-2">
                <DataRow label="Total due" value={money(totalDue)} />
                <DataRow label="Already paid" value={money(ticket.paid)} />
                <DataRow label="Balance due now" value={money(balance)} strong critical={balance > 0} />
              </div>

              {balance > 0 && (
                <>
                  <Caption className="mb-1.5 mt-3">Payment method</Caption>
                  <div className="grid grid-cols-3 gap-1.5">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className={cx(
                          "rounded-lg border py-1.5 text-[11px] font-medium transition-colors cursor-pointer",
                          method === m
                            ? "border-brand bg-brand-soft text-brand-strong"
                            : "border-black/10 text-ink-secondary hover:border-black/25"
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <Field label="Notes" className="mt-3">
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything worth recording at handover"
                  className="min-h-16"
                />
              </Field>

              <Button size="lg" className="mt-3 w-full" disabled={!canRelease} onClick={release}>
                <PackageCheck size={15} />
                {releasing
                  ? "Releasing…"
                  : balance > 0
                    ? `Collect ${money(balance)} and release`
                    : "Release the vehicle"}
              </Button>
              <p className="mt-2 text-center text-[11px] leading-relaxed text-ink-muted">
                {notReady
                  ? "The job is not ready to claim yet."
                  : !claimedBy.trim()
                    ? "Enter who is claiming the unit to continue."
                    : "Any property still held is marked returned."}
              </p>
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}

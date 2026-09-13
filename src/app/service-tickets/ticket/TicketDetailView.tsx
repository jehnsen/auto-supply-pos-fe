"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Ban,
  ClipboardCheck,
  Gauge,
  Plus,
  Printer,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";
import {
  addLine,
  addNote,
  addProperty,
  advanceStatus,
  assignTicket,
  balanceDue,
  BOARD_STAGES,
  cancelTicket,
  getTicket,
  isOpenStatus,
  promiseLabel,
  releaseTicket,
  removeLine,
  returnProperty,
  setDiagnosis,
  stageOf,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_ORDER,
  TICKET_STATUS_TONES,
  ticketTotal,
  type Actor,
  type CustodyEvent,
  type ServiceTicket,
  type TicketStatus,
} from "@/lib/api/service-tickets";
import { useAuthStore } from "@/lib/auth-store";
import { useRecordId } from "@/lib/use-record-id";
import { Caption, Chip, DataRow } from "@/components/panel";
import { cx, formatDate, formatDateTime, formatMoney } from "@/lib/utils";
import {
  Badge,
  Button,
  ConfirmDialog,
  Field,
  Input,
  Modal,
  PromptDialog,
  Select,
  Spinner,
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/ui";
import { TicketSlipPrint } from "./TicketSlipPrint";

export default function TicketDetailView() {
  // Addressed as /service-tickets/ticket?id=<uuid> — see `useRecordId` for why.
  const uuid = useRecordId();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const currency = user?.store.currency ?? "PHP";
  const money = (n: number) =>
    formatMoney(n, currency);

  const actor: Actor = { uuid: user?.uuid ?? null, name: user?.name ?? "Staff" };

  const [ticket, setTicket] = useState<ServiceTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addLineOpen, setAddLineOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [diagnosisOpen, setDiagnosisOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [propertyOpen, setPropertyOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [removingLine, setRemovingLine] = useState<string | null>(null);
  const [slipKind, setSlipKind] = useState<"intake" | "release" | null>(null);

  const load = useCallback(async () => {
    try {
      const found = await getTicket(uuid);
      if (!found) {
        setNotFound(true);
        return;
      }
      setTicket(found);
      setNotFound(false);
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => {
    load();
  }, [load]);

  /** Wraps a mutation so every action surfaces failures the same way and refreshes once. */
  async function run(action: () => Promise<ServiceTicket>) {
    setError(null);
    try {
      const updated = await action();
      setTicket(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the job order");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-14">
        <Spinner size="md" />
      </div>
    );
  }

  if (notFound || !ticket) {
    return (
      <div className="flex flex-col items-center gap-2 p-14 text-center">
        <AlertTriangle size={28} className="text-status-critical" />
        <p className="text-sm font-medium text-status-critical">Job order not found</p>
        <p className="max-w-sm text-xs text-ink-muted">
          {uuid
            ? "No job order matches that id. It may have been cancelled, or the link may be incomplete."
            : "No job order was specified. Open one from the repair board."}
        </p>
        <Button variant="secondary" size="sm" onClick={() => router.push("/service-tickets")}>
          Back to repair jobs
        </Button>
      </div>
    );
  }

  const open = isOpenStatus(ticket.status);
  const total = ticketTotal(ticket);
  const heldProperty = ticket.property.filter((p) => !p.returned_at);
  const nextStatus = nextStatusAfter(ticket.status);
  const promise = promiseLabel(ticket.promised_at);
  const balance = balanceDue(ticket);
  const totalDue = ticket.estimate + total;
  const stage = stageOf(ticket.status);
  const stageAccent = BOARD_STAGES.find((s) => s.id === stage)?.accent ?? "var(--ink-muted)";

  return (
    <div className="p-6">
      <button
        onClick={() => router.push("/service-tickets")}
        className="mb-3 flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink cursor-pointer"
      >
        <ArrowLeft size={14} /> Back to repair jobs
      </button>

      {/*
        Identity block: the job number and the claim code carry equal weight — staff work
        from the former, the customer quotes the latter at the counter.
      */}
      <div className="relative mb-4 rounded-lg border border-black/[0.09] bg-card">
        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] rounded-l-lg" style={{ background: stageAccent }} />
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pb-4 pt-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div>
                <Caption>Job order no.</Caption>
                <p className="font-mono text-xl font-semibold tracking-tight">{ticket.ticket_number}</p>
              </div>
              <div>
                <Caption>Claim code</Caption>
                <p className="rounded bg-brand-soft px-2 py-0.5 font-mono text-xl font-semibold tracking-[0.2em] text-brand-strong">
                  {ticket.claim_code}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold">{ticket.customer_name}</p>
            <p className="font-mono text-xs text-ink-secondary">{ticket.vehicle_label}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => setSlipKind("intake")}>
              <Printer size={15} /> Intake slip
            </Button>
            {ticket.status === "released" && (
              <Button variant="secondary" onClick={() => setSlipKind("release")}>
                <Printer size={15} /> Release slip
              </Button>
            )}
            {open && (
              <>
                <Button variant="secondary" onClick={() => setAssignOpen(true)}>
                  <UserRound size={15} /> Assign
                </Button>
                {nextStatus && (
                  <Button onClick={() => run(() => advanceStatus(ticket.uuid, nextStatus, actor))}>
                    <ArrowRight size={15} /> {TICKET_STATUS_LABELS[nextStatus]}
                  </Button>
                )}
                {ticket.status === "ready_for_release" && (
                  <Button onClick={() => setReleaseOpen(true)}>
                    <ClipboardCheck size={15} /> Release vehicle
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Stat strip: the four things asked across the counter most often. */}
        <div className="grid grid-cols-2 gap-4 border-t border-black/[0.07] px-5 py-3 sm:grid-cols-4">
          <div>
            <Caption>Stage</Caption>
            <p className="mt-0.5">
              <Badge tone={TICKET_STATUS_TONES[ticket.status]}>{TICKET_STATUS_LABELS[ticket.status]}</Badge>
            </p>
          </div>
          <div>
            <Caption>Promised</Caption>
            <p className={cx("text-sm", promise?.late && "font-semibold text-status-critical")}>
              {ticket.promised_at ? formatDate(ticket.promised_at) : "—"}
              {promise && <span className="ml-1.5 text-xs font-normal text-ink-muted">{promise.text}</span>}
            </p>
          </div>
          <div>
            <Caption>Owed</Caption>
            <p className={cx("tabular text-sm font-semibold", balance > 0 && "text-status-critical")}>{money(balance)}</p>
          </div>
          <div>
            <Caption>Technician</Caption>
            <p className="text-sm">
              {ticket.assigned_to ?? <span className="text-ink-muted">Unassigned</span>}
              {ticket.bay && <span className="ml-1 text-xs text-ink-muted">· bay {ticket.bay}</span>}
            </p>
          </div>
        </div>
      </div>

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {heldProperty.length > 0 && (
          <Badge tone="warning">
            Holding {heldProperty.length} item{heldProperty.length === 1 ? "" : "s"} of customer property
          </Badge>
        )}
        {ticket.warranty_days > 0 && <Badge tone="brand">{ticket.warranty_days}-day warranty on repair</Badge>}
        {ticket.odometer_in != null && (
          <span className="flex items-center gap-1 text-xs text-ink-muted">
            <Gauge size={13} /> {ticket.odometer_in.toLocaleString()} km at intake
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left column */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          {/* Complaint & diagnosis */}
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Complaint & diagnosis</h3>
              {open && (
                <Button size="sm" variant="secondary" onClick={() => setDiagnosisOpen(true)}>
                  <Wrench size={13} /> Record diagnosis
                </Button>
              )}
            </div>
            <p className="text-sm">
              <span className="text-ink-muted">Reported:</span> {ticket.complaint || "—"}
            </p>
            <p className="mt-2 text-sm">
              <span className="text-ink-muted">Findings:</span>{" "}
              {ticket.diagnosis ?? <span className="text-ink-muted">Not yet recorded</span>}
            </p>
          </div>

          {/* Parts & labour */}
          <div className="card">
            <div className="flex items-center justify-between border-b border-black/[0.07] p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Parts & labour</h3>
              {open && (
                <Button size="sm" variant="secondary" onClick={() => setAddLineOpen(true)}>
                  <Plus size={13} /> Add line
                </Button>
              )}
            </div>
            {ticket.lines.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-muted">Nothing charged to this job yet.</p>
            ) : (
              <>
                <Table>
                  <thead>
                    <tr>
                      <Th>Description</Th>
                      <Th>Type</Th>
                      <Th right>Qty</Th>
                      <Th right>Unit price</Th>
                      <Th right>Total</Th>
                      {open && <Th />}
                    </tr>
                  </thead>
                  <tbody>
                    {ticket.lines.map((l) => (
                      <tr key={l.uuid}>
                        <Td>{l.description}</Td>
                        <Td>
                          <span className="text-xs capitalize text-ink-muted">{l.kind === "labor" ? "Labour" : "Part"}</span>
                        </Td>
                        <Td right>{l.quantity}</Td>
                        <Td right>{money(l.unit_price)}</Td>
                        <Td right className="font-medium">
                          {money(l.quantity * l.unit_price)}
                        </Td>
                        {open && (
                          <Td right>
                            <button
                              onClick={() => setRemovingLine(l.uuid)}
                              className="rounded p-1 text-ink-muted hover:bg-black/[0.05] hover:text-status-critical cursor-pointer"
                              aria-label={`Remove ${l.description}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </Td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <div className="flex items-center justify-between border-t border-black/[0.07] px-4 py-3">
                  <span className="text-sm font-semibold">Job total (before VAT)</span>
                  <span className="tabular text-lg font-bold">{money(total)}</span>
                </div>
              </>
            )}
          </div>

          {/* Chain of custody */}
          <div className="card">
            <div className="flex items-center justify-between border-b border-black/[0.07] p-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Chain of custody</h3>
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  Append-only — entries are never edited or deleted, only superseded.
                </p>
              </div>
              {open && (
                <Button size="sm" variant="secondary" onClick={() => setNoteOpen(true)}>
                  <Plus size={13} /> Add note
                </Button>
              )}
            </div>
            <div className="p-4">
              <CustodyTimeline events={ticket.custody} />
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <div className="card p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Status</h3>
            <div className="flex flex-col gap-1.5">
              {TICKET_STATUS_ORDER.map((s) => {
                const reached = TICKET_STATUS_ORDER.indexOf(s) <= TICKET_STATUS_ORDER.indexOf(ticket.status);
                const current = s === ticket.status;
                return (
                  <div
                    key={s}
                    className={cx(
                      "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm",
                      current ? "bg-brand-soft font-medium text-brand-strong" : reached ? "text-ink-secondary" : "text-ink-muted"
                    )}
                  >
                    <span
                      className={cx(
                        "h-1.5 w-1.5 shrink-0 rounded-full",
                        current ? "bg-brand" : reached ? "bg-ink-muted" : "bg-black/15"
                      )}
                    />
                    {TICKET_STATUS_LABELS[s]}
                  </div>
                );
              })}
            </div>
            {open && (
              <div className="mt-3 flex flex-col gap-2 border-t border-black/[0.07] pt-3">
                <Select
                  value={ticket.status}
                  onChange={(e) => run(() => advanceStatus(ticket.uuid, e.target.value as TicketStatus, actor))}
                >
                  {TICKET_STATUS_ORDER.filter((s) => s !== "released").map((s) => (
                    <option key={s} value={s}>
                      {TICKET_STATUS_LABELS[s]}
                    </option>
                  ))}
                </Select>
                <Button variant="ghost" className="border border-black/10" onClick={() => setCancelOpen(true)}>
                  <Ban size={14} /> Cancel job
                </Button>
              </div>
            )}
          </div>

          {/* Money — mirrors the counter's question order: quoted, owed, paid, outstanding. */}
          <div className="card p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Money</h3>
            <DataRow label="Estimate" value={money(ticket.estimate)} />
            {total > 0 && <DataRow label="Parts & labour" value={money(total)} />}
            <DataRow label="Total due" value={money(totalDue)} />
            <DataRow label="Paid" value={money(ticket.paid)} />
            <div className="border-t border-black/[0.07]">
              <DataRow label="Still owed" value={money(balance)} strong critical={balance > 0} />
            </div>
            {open && balance > 0 && (
              <Button className="mt-2 w-full" onClick={() => setReleaseOpen(true)}>
                Take payment · {money(balance)}
              </Button>
            )}
          </div>

          {/* Condition at intake — the walk-around, kept beside the property list. */}
          {ticket.condition_notes.length > 0 && (
            <div className="card p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Condition at intake</h3>
              <div className="flex flex-wrap gap-1.5">
                {ticket.condition_notes.map((c) => (
                  <Chip key={c}>{c}</Chip>
                ))}
              </div>
            </div>
          )}

          {/* Customer property */}
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Customer property</h3>
              {open && (
                <Button size="sm" variant="secondary" onClick={() => setPropertyOpen(true)}>
                  <Plus size={13} />
                </Button>
              )}
            </div>
            {ticket.property.length === 0 ? (
              <p className="text-sm text-ink-muted">Nothing held with this unit.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {ticket.property.map((p) => (
                  <div
                    key={p.uuid}
                    className="flex items-center justify-between gap-2 rounded-lg border border-black/[0.07] px-2.5 py-1.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.label}</p>
                      {p.note && <p className="text-[11px] text-ink-muted">{p.note}</p>}
                    </div>
                    {p.returned_at ? (
                      <Badge tone="neutral">Returned</Badge>
                    ) : open ? (
                      <Button size="sm" variant="ghost" onClick={() => run(() => returnProperty(ticket.uuid, p.uuid, actor))}>
                        Return
                      </Button>
                    ) : (
                      <Badge tone="warning">Held</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Details</h3>
            <div className="flex flex-col gap-2 text-sm">
              <Detail label="Customer" value={ticket.customer_name} />
              <Detail label="Vehicle" value={ticket.vehicle_label} />
              <Detail label="Opened" value={formatDateTime(ticket.created_at)} />
              {ticket.promised_at && <Detail label="Promised" value={formatDateTime(ticket.promised_at)} />}
              {ticket.released_at && <Detail label="Released" value={formatDateTime(ticket.released_at)} />}
            </div>
          </div>
        </div>
      </div>

      {/* ---- Dialogs ---- */}

      {/*
        Each dialog is keyed on its open flag so opening one mounts a fresh instance with
        pristine fields. That replaces the reset-on-open effects these forms would otherwise
        need (and which `react-hooks/set-state-in-effect` rightly flags).
      */}
      {addLineOpen && (
        <AddLineModal
          onClose={() => setAddLineOpen(false)}
          onAdd={async (line) => {
            await run(() => addLine(ticket.uuid, line, actor));
            setAddLineOpen(false);
          }}
        />
      )}

      {assignOpen && (
        <AssignModal
          initialAssignee={ticket.assigned_to ?? ""}
          initialBay={ticket.bay ?? ""}
          onClose={() => setAssignOpen(false)}
          onSave={async (assignee, bay) => {
            await run(() => assignTicket(ticket.uuid, assignee, bay, actor));
            setAssignOpen(false);
          }}
        />
      )}

      {releaseOpen && (
        <ReleaseModal
          heldCount={heldProperty.length}
          defaultReceiver={ticket.customer_name}
          onClose={() => setReleaseOpen(false)}
          onRelease={async (receivedBy, odometer, notes) => {
            await run(() =>
              releaseTicket(ticket.uuid, { received_by: receivedBy, odometer_out: odometer, notes }, actor)
            );
            setReleaseOpen(false);
            setSlipKind("release");
          }}
        />
      )}

      <PromptDialog
        open={diagnosisOpen}
        onClose={() => setDiagnosisOpen(false)}
        title="Record diagnosis"
        label="What did the technician find?"
        placeholder="e.g. Valve stem cracked; rear pads at 2mm"
        confirmLabel="Save diagnosis"
        multiline
        onSubmit={async (value) => {
          await run(() => setDiagnosis(ticket.uuid, value, actor));
          setDiagnosisOpen(false);
        }}
      />

      <PromptDialog
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Add a custody note"
        label="Note"
        placeholder="e.g. Customer approved brake pad replacement by phone"
        confirmLabel="Add note"
        multiline
        onSubmit={async (value) => {
          await run(() => addNote(ticket.uuid, value, actor));
          setNoteOpen(false);
        }}
      />

      <PromptDialog
        open={propertyOpen}
        onClose={() => setPropertyOpen(false)}
        title="Check in customer property"
        label="Item"
        placeholder="e.g. Helmet, tool bag"
        confirmLabel="Check in"
        onSubmit={async (value) => {
          await run(() => addProperty(ticket.uuid, value, null, actor));
          setPropertyOpen(false);
        }}
      />

      <PromptDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this job order"
        message="The job will be closed as cancelled. The custody trail is kept intact."
        label="Reason"
        placeholder="e.g. Customer declined the quote"
        confirmLabel="Cancel job"
        tone="danger"
        onSubmit={async (value) => {
          await run(() => cancelTicket(ticket.uuid, value, actor));
          setCancelOpen(false);
        }}
      />

      <ConfirmDialog
        open={removingLine !== null}
        onClose={() => setRemovingLine(null)}
        onConfirm={() => {
          if (removingLine) run(() => removeLine(ticket.uuid, removingLine, actor));
        }}
        title="Remove this line?"
        message="The removal is recorded in the chain of custody."
        confirmLabel="Remove"
      />

      {slipKind && <TicketSlipPrint ticket={ticket} kind={slipKind} money={money} onClose={() => setSlipKind(null)} />}
    </div>
  );
}

/** The next step in the happy path, or null at a terminal//branching state. */
function nextStatusAfter(status: TicketStatus): TicketStatus | null {
  if (status === "ready_for_release" || status === "released" || status === "cancelled") return null;
  const i = TICKET_STATUS_ORDER.indexOf(status);
  if (i === -1) return null;
  const next = TICKET_STATUS_ORDER[i + 1];
  return next === "released" ? null : next ?? null;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="text-ink-muted">{label}:</span> {value}
    </p>
  );
}

const EVENT_DOTS: Record<CustodyEvent["type"], string> = {
  intake: "bg-brand",
  release: "bg-status-good",
  status_change: "bg-series-1",
  assignment: "bg-series-5",
  parts_used: "bg-series-3",
  property_update: "bg-status-warning",
  note: "bg-ink-muted",
  correction: "bg-status-critical",
};

function CustodyTimeline({ events }: { events: CustodyEvent[] }) {
  if (events.length === 0) return <p className="text-sm text-ink-muted">No events recorded.</p>;
  return (
    <ol className="relative flex flex-col gap-4 pl-5">
      {/* Spine */}
      <span aria-hidden className="absolute bottom-2 left-[3px] top-2 w-px bg-black/10" />
      {events.map((e) => (
        <li key={e.uuid} className="relative">
          <span className={cx("absolute -left-5 top-1.5 h-[7px] w-[7px] rounded-full", EVENT_DOTS[e.type])} />
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="text-sm font-medium">{e.summary}</p>
            <p className="text-[11px] text-ink-muted">{formatDateTime(e.at)}</p>
          </div>
          {e.detail && <p className="mt-0.5 text-[13px] leading-relaxed text-ink-secondary">{e.detail}</p>}
          <p className="mt-0.5 text-[11px] text-ink-muted">
            by {e.actor_name}
            {e.released_by && ` · released by ${e.released_by}`}
            {e.received_by && ` · received by ${e.received_by}`}
            {e.odometer_km != null && ` · ${e.odometer_km.toLocaleString()} km`}
          </p>
        </li>
      ))}
    </ol>
  );
}

/* ---------- Dialogs ---------- */

/** Mounted only while open (see the call site), so initial state is always pristine. */
function AddLineModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (line: { product_uuid: string | null; description: string; quantity: number; unit_price: number; kind: "part" | "labor" }) => Promise<void>;
}) {
  const [kind, setKind] = useState<"part" | "labor">("part");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("");

  const canAdd = description.trim() && Number(quantity) > 0 && Number(price) >= 0;

  return (
    <Modal
      open
      onClose={onClose}
      title="Add parts or labour"
      width="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!canAdd}
            onClick={() =>
              onAdd({
                product_uuid: null,
                description: description.trim(),
                quantity: Number(quantity),
                unit_price: Number(price),
                kind,
              })
            }
          >
            Add line
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Type">
          <Select value={kind} onChange={(e) => setKind(e.target.value as "part" | "labor")}>
            <option value="part">Part</option>
            <option value="labor">Labour</option>
          </Select>
        </Field>
        <Field label="Description">
          <Input
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={kind === "labor" ? "e.g. PMS + brake service" : "e.g. Dunlop D404 150/80-16"}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <Input type="number" min={0} step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </Field>
          <Field label="Unit price">
            <Input type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

/** Mounted only while open, so the initial values seed the fields directly. */
function AssignModal({
  initialAssignee,
  initialBay,
  onClose,
  onSave,
}: {
  initialAssignee: string;
  initialBay: string;
  onClose: () => void;
  onSave: (assignee: string, bay: string) => Promise<void>;
}) {
  const [assignee, setAssignee] = useState(initialAssignee);
  const [bay, setBay] = useState(initialBay);

  return (
    <Modal
      open
      onClose={onClose}
      title="Assign this job"
      width="max-w-sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(assignee, bay)}>Save</Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Technician">
          <Input autoFocus value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="e.g. Mario" />
        </Field>
        <Field label="Bay">
          <Input value={bay} onChange={(e) => setBay(e.target.value)} placeholder="e.g. 2" />
        </Field>
      </div>
    </Modal>
  );
}

/** Mounted only while open, so the default receiver seeds the field directly. */
function ReleaseModal({
  heldCount,
  defaultReceiver,
  onClose,
  onRelease,
}: {
  heldCount: number;
  defaultReceiver: string;
  onClose: () => void;
  onRelease: (receivedBy: string, odometer: number | null, notes: string | null) => Promise<void>;
}) {
  const [receivedBy, setReceivedBy] = useState(defaultReceiver);
  const [odometer, setOdometer] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <Modal
      open
      onClose={onClose}
      title="Release the vehicle"
      width="max-w-md"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!receivedBy.trim()}
            onClick={() => onRelease(receivedBy, odometer.trim() ? Number(odometer) : null, notes.trim() || null)}
          >
            Release & print slip
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {heldCount > 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            {heldCount} item{heldCount === 1 ? "" : "s"} of customer property will be marked returned.
          </p>
        )}
        <Field label="Released to (who collected the unit)">
          <Input autoFocus value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
        </Field>
        <Field label="Odometer out (km)">
          <Input type="number" min={0} value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="42130" />
        </Field>
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth recording at handover" />
        </Field>
      </div>
    </Modal>
  );
}

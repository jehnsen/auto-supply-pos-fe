"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, Columns3, Plus, Rows3, Search, X } from "lucide-react";
import {
  advanceStatus,
  BOARD_STAGES,
  isOpenStatus,
  isStalled,
  listTickets,
  primaryStatusForStage,
  promiseLabel,
  stageOf,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_TONES,
  type BoardStage,
  type ServiceTicket,
} from "@/lib/api/service-tickets";
import { useAuthStore } from "@/lib/auth-store";
import { CounterHeader } from "@/components/CounterHeader";
import { cx, formatDate } from "@/lib/utils";
import { Badge, Button, Input, Select, Spinner, Table, Td, Th } from "@/components/ui";

type View = "board" | "table";

export default function RepairBoardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const actor = { uuid: user?.uuid ?? null, name: user?.name ?? "Staff" };

  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("board");
  const [showClosed, setShowClosed] = useState(false);
  const [makeFilter, setMakeFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [moving, setMoving] = useState(false);
  const [draggingUuid, setDraggingUuid] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<BoardStage | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const load = useCallback(async () => {
    try {
      setTickets(await listTickets({ q: debouncedQuery || undefined }));
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Makes present in the data, so the filter never offers an empty option.
   *
   * `describeVehicle` renders "PLATE · [YEAR] MAKE MODEL" — the year is optional, so the
   * make is not at a fixed position. Take the first word that isn't a 4-digit year.
   */
  const makes = useMemo(() => {
    const set = new Set<string>();
    for (const t of tickets) {
      const spec = t.vehicle_label.split("·")[1]?.trim().split(/\s+/) ?? [];
      const make = spec.find((w) => !/^\d{4}$/.test(w));
      if (make) set.add(make);
    }
    return [...set].sort();
  }, [tickets]);

  const visible = useMemo(() => {
    let rows = showClosed ? tickets : tickets.filter((t) => isOpenStatus(t.status));
    if (makeFilter !== "all") rows = rows.filter((t) => t.vehicle_label.includes(makeFilter));
    // Oldest promise first: whatever is most overdue rises to the top of its column.
    return rows.sort((a, b) => {
      if (!a.promised_at) return 1;
      if (!b.promised_at) return -1;
      return a.promised_at.localeCompare(b.promised_at);
    });
  }, [tickets, showClosed, makeFilter]);

  const openCount = tickets.filter((t) => isOpenStatus(t.status)).length;

  function toggleSelect(uuid: string) {
    setSelected((s) => (s.includes(uuid) ? s.filter((x) => x !== uuid) : [...s, uuid]));
  }

  async function moveSelected(stage: BoardStage) {
    setMoving(true);
    try {
      const status = primaryStatusForStage(stage);
      for (const uuid of selected) {
        await advanceStatus(uuid, status, actor, "Moved from the board");
      }
      setSelected([]);
      await load();
    } finally {
      setMoving(false);
    }
  }

  async function moveTicket(uuid: string, stage: BoardStage) {
    const ticket = tickets.find((t) => t.uuid === uuid);
    if (!ticket || stageOf(ticket.status) === stage) return;
    const status = primaryStatusForStage(stage);
    // Optimistic: the board should feel instant, then reconcile with the server's response.
    setTickets((prev) => prev.map((t) => (t.uuid === uuid ? { ...t, status } : t)));
    try {
      const updated = await advanceStatus(uuid, status, actor, "Moved from the board");
      setTickets((prev) => prev.map((t) => (t.uuid === uuid ? updated : t)));
    } catch {
      await load();
    }
  }

  return (
    <div className="p-6">
      <CounterHeader
        title="Repair board"
        subtitle="Every open job, oldest promise first. Overdue jobs carry the red edge."
        actions={
          <>
            <div className="inline-flex rounded-lg border border-black/10 bg-card p-0.5 shadow-sm">
              {(["board", "table"] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cx(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide transition-colors cursor-pointer",
                    view === v ? "bg-brand text-white" : "text-ink-secondary hover:text-ink"
                  )}
                >
                  {v === "board" ? <Columns3 size={13} /> : <Rows3 size={13} />}
                  {v}
                </button>
              ))}
            </div>
            <Link href="/service-tickets/intake" prefetch={false}>
              <Button>
                <Plus size={15} /> New job order
              </Button>
            </Link>
          </>
        }
      />

      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Job order, claim code, plate, or name"
            className="pl-9"
          />
        </div>
        <Select value={makeFilter} onChange={(e) => setMakeFilter(e.target.value)} className="w-40">
          <option value="all">All makes</option>
          {makes.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        <Button variant={showClosed ? "primary" : "secondary"} onClick={() => setShowClosed((s) => !s)}>
          <Archive size={14} /> Show closed
        </Button>
        <span className="ml-auto text-xs text-ink-muted">
          {visible.length} of {openCount} open
        </span>
      </div>

      {/* Bulk actions — only once something is picked */}
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-brand/25 bg-brand-soft px-3 py-2">
          <span className="text-sm font-medium text-brand-strong">{selected.length} selected</span>
          <Select
            defaultValue=""
            disabled={moving}
            onChange={(e) => e.target.value && moveSelected(e.target.value as BoardStage)}
            className="w-48"
          >
            <option value="">Move to…</option>
            {BOARD_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </Select>
          <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
            <X size={13} /> Clear
          </Button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : view === "board" ? (
        <div className="scrollbar-hidden -mx-1 flex gap-3 overflow-x-auto px-1 pb-4">
          {BOARD_STAGES.map((stage) => {
            const cards = visible.filter((t) => stageOf(t.status) === stage.id);
            const isDragOver = dragOverStage === stage.id;
            return (
              <section key={stage.id} className="flex w-72 shrink-0 flex-col">
                <div
                  className="rounded-t-lg border-x border-t border-black/[0.07] bg-card px-3 py-2.5"
                  style={{ borderTop: `3px solid ${stage.accent}` }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink">{stage.title}</h2>
                    <span className="tabular text-xs font-semibold text-ink-muted">{cards.length}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-ink-muted">{stage.blurb}</p>
                </div>
                <div
                  onDragOver={(e) => {
                    if (!draggingUuid) return;
                    e.preventDefault();
                    setDragOverStage(stage.id);
                  }}
                  onDragLeave={() => setDragOverStage((s) => (s === stage.id ? null : s))}
                  onDrop={(e) => {
                    e.preventDefault();
                    const uuid = e.dataTransfer.getData("text/plain") || draggingUuid;
                    setDragOverStage(null);
                    setDraggingUuid(null);
                    if (uuid) moveTicket(uuid, stage.id);
                  }}
                  className={cx(
                    "flex flex-1 flex-col gap-2 rounded-b-lg border-x border-b p-2 transition-colors",
                    isDragOver ? "border-brand/40 bg-brand-soft" : "border-black/[0.07] bg-black/[0.015]"
                  )}
                >
                  {cards.length === 0 ? (
                    <p className="py-6 text-center text-xs text-ink-muted">{isDragOver ? "Drop here" : "Empty"}</p>
                  ) : (
                    cards.map((t) => (
                      <JobCard
                        key={t.uuid}
                        ticket={t}
                        selected={selected.includes(t.uuid)}
                        dragging={draggingUuid === t.uuid}
                        onSelect={() => toggleSelect(t.uuid)}
                        onOpen={() => router.push(`/service-tickets/ticket?id=${t.uuid}`)}
                        onDragStart={() => setDraggingUuid(t.uuid)}
                        onDragEnd={() => {
                          setDraggingUuid(null);
                          setDragOverStage(null);
                        }}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <Table>
            <thead>
              <tr>
                <Th>Job order</Th>
                <Th>Claim</Th>
                <Th>Vehicle</Th>
                <Th>Customer</Th>
                <Th>Stage</Th>
                <Th>Technician</Th>
                <Th right>Promised</Th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => {
                const promise = promiseLabel(t.promised_at);
                return (
                  <tr key={t.uuid} className="transition-colors hover:bg-black/[0.02]">
                    <Td>
                      <Link
                        href={`/service-tickets/ticket?id=${t.uuid}`}
                        prefetch={false}
                        className="font-mono text-xs font-semibold text-brand-strong hover:underline"
                      >
                        {t.ticket_number}
                      </Link>
                    </Td>
                    <Td>
                      <span className="font-mono text-xs tracking-wider">{t.claim_code}</span>
                    </Td>
                    <Td className="font-mono text-xs">{t.vehicle_label}</Td>
                    <Td className="text-ink-secondary">{t.customer_name}</Td>
                    <Td>
                      <Badge tone={TICKET_STATUS_TONES[t.status]}>{TICKET_STATUS_LABELS[t.status]}</Badge>
                    </Td>
                    <Td className="text-ink-secondary">{t.assigned_to ?? <span className="text-ink-muted">—</span>}</Td>
                    <Td right className="whitespace-nowrap text-xs">
                      {t.promised_at ? (
                        <span className={cx(promise?.late && "font-medium text-status-critical")}>
                          {formatDate(t.promised_at)}
                        </span>
                      ) : (
                        <span className="text-ink-muted">—</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
          {visible.length === 0 && <p className="py-14 text-center text-sm text-ink-muted">No job orders here.</p>}
        </div>
      )}
    </div>
  );
}

function JobCard({
  ticket,
  selected,
  dragging,
  onSelect,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  ticket: ServiceTicket;
  selected: boolean;
  dragging: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}) {
  const promise = promiseLabel(ticket.promised_at);
  const stalled = isStalled(ticket);
  const didDragRef = useRef(false);

  return (
    <article
      onClick={() => {
        if (didDragRef.current) {
          didDragRef.current = false;
          return;
        }
        onOpen();
      }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", ticket.uuid);
        e.dataTransfer.effectAllowed = "move";
        didDragRef.current = true;
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cx(
        "group cursor-grab rounded-lg border border-black/[0.07] bg-card p-2.5 transition-all hover:shadow-md active:cursor-grabbing",
        // The red edge is the board's one urgent signal: this job is past its promise.
        promise?.late && "border-l-[3px] border-l-status-critical",
        selected && "ring-2 ring-brand/40",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <input
            type="checkbox"
            checked={selected}
            onClick={(e) => e.stopPropagation()}
            onChange={onSelect}
            className="accent-brand"
            aria-label={`Select ${ticket.ticket_number}`}
          />
          <span className="truncate font-mono text-[11px] font-semibold text-ink-secondary">{ticket.ticket_number}</span>
        </div>
        {stalled && (
          <span className="shrink-0 rounded bg-black/[0.06] px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-ink-muted">
            Stalled
          </span>
        )}
      </div>

      <p className="mt-1.5 truncate text-sm font-semibold">{ticket.customer_name}</p>
      <p className="truncate text-xs text-ink-secondary">{ticket.vehicle_label}</p>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        {promise ? (
          <span className={cx("text-[11px] font-medium", promise.late ? "text-status-critical" : "text-ink-muted")}>
            {promise.text}
          </span>
        ) : (
          <span className="text-[11px] text-ink-muted">no promise date</span>
        )}
        {ticket.assigned_to && <span className="truncate text-[11px] text-ink-muted">{ticket.assigned_to}</span>}
      </div>
    </article>
  );
}

"use client";

/**
 * Service / repair tickets with chain of custody.
 *
 * Backed by `/api/v1/service-tickets`. Every write returns the whole updated ticket, so
 * callers can replace their local copy from the response rather than refetching.
 *
 * Money crosses the wire in **pesos**: the API stores centavos and converts on both read
 * (Resource) and write (FormRequest accepts decimals), so nothing here scales amounts.
 *
 * The custody trail is append-only and the server enforces that — corrections are recorded
 * as new events that supersede the old one, never edits.
 */

import { apiRequest } from "./client";

/* ---------- Status ---------- */

/**
 * The bay workflow, in order. `released` and `cancelled` are terminal.
 *
 * `awaiting_approval` and `awaiting_parts` are holding states a job bounces back from —
 * real shops stall on a customer's go-ahead or a part on order, and a model without them
 * forces staff to misreport where a job actually is.
 */
export type TicketStatus =
  | "received"
  | "diagnosing"
  | "awaiting_approval"
  | "awaiting_parts"
  | "in_progress"
  | "quality_check"
  | "ready_for_release"
  | "released"
  | "cancelled";

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  received: "Received",
  diagnosing: "Diagnosing",
  awaiting_approval: "Awaiting approval",
  awaiting_parts: "Awaiting parts",
  in_progress: "In progress",
  quality_check: "Quality check",
  ready_for_release: "Ready for release",
  released: "Released",
  cancelled: "Cancelled",
};

/** Badge tone per status, matching the `Badge` component's tones. */
export const TICKET_STATUS_TONES: Record<TicketStatus, "neutral" | "good" | "warning" | "critical" | "brand"> = {
  received: "neutral",
  diagnosing: "brand",
  awaiting_approval: "warning",
  awaiting_parts: "warning",
  in_progress: "brand",
  quality_check: "brand",
  ready_for_release: "good",
  released: "neutral",
  cancelled: "critical",
};

export const TICKET_STATUS_ORDER: TicketStatus[] = [
  "received",
  "diagnosing",
  "awaiting_approval",
  "awaiting_parts",
  "in_progress",
  "quality_check",
  "ready_for_release",
  "released",
];

/** A ticket still occupying a bay — everything except the two terminal states. */
export function isOpenStatus(status: TicketStatus): boolean {
  return status !== "released" && status !== "cancelled";
}

/* ---------- Board stages ---------- */

/**
 * The counter's board groups the nine statuses into five columns — the view a service
 * writer actually works from. Statuses stay the source of truth; stages are a projection.
 */
export type BoardStage = "to_check" | "waiting_customer" | "waiting_parts" | "in_repair" | "ready_to_claim";

export const BOARD_STAGES: {
  id: BoardStage;
  title: string;
  blurb: string;
  /** Column top-edge accent. Literal hues: these are wayfinding, not brand surfaces. */
  accent: string;
  statuses: TicketStatus[];
}[] = [
  { id: "to_check", title: "To check", blurb: "Not looked at yet", accent: "#f59e0b", statuses: ["received", "diagnosing"] },
  { id: "waiting_customer", title: "Waiting for customer", blurb: "Quoted — waiting on a yes or no", accent: "#8b5cf6", statuses: ["awaiting_approval"] },
  { id: "waiting_parts", title: "Waiting for parts", blurb: "Ordered — waiting on delivery", accent: "#eab308", statuses: ["awaiting_parts"] },
  { id: "in_repair", title: "In repair", blurb: "On the lift", accent: "#6366f1", statuses: ["in_progress", "quality_check"] },
  { id: "ready_to_claim", title: "Ready to claim", blurb: "Fixed — waiting for pickup", accent: "#10b981", statuses: ["ready_for_release"] },
];

export function stageOf(status: TicketStatus): BoardStage | null {
  return BOARD_STAGES.find((s) => s.statuses.includes(status))?.id ?? null;
}

/** The status a card lands on when moved into a column. */
export function primaryStatusForStage(stage: BoardStage): TicketStatus {
  return BOARD_STAGES.find((s) => s.id === stage)!.statuses[0];
}

/* ---------- Custody ---------- */

export type CustodyEventType =
  | "intake"
  | "status_change"
  | "assignment"
  | "parts_used"
  | "note"
  | "property_update"
  | "release"
  | "correction";

/**
 * One immutable entry in a ticket's chain of custody.
 *
 * `actor_name` is captured server-side at write time rather than resolved on read: if a
 * staff account is later renamed or deactivated, the historical record must still show who
 * was holding the vehicle at that moment.
 */
export interface CustodyEvent {
  uuid: string;
  type: CustodyEventType;
  /** ISO timestamp. */
  at: string;
  actor_uuid: string | null;
  actor_name: string;
  /** Short human summary, e.g. "Status: In progress → Quality check". */
  summary: string;
  /** Free-text detail: condition notes, findings, the reason for a correction. */
  detail: string | null;
  /** Who physically handed the vehicle over, for intake/release events. */
  released_by: string | null;
  received_by: string | null;
  odometer_km: number | null;
  /** For `correction`: the uuid of the event being superseded. */
  supersedes_uuid: string | null;
}

/** An item of customer property checked in with the vehicle. */
export interface CustodyItem {
  uuid: string;
  label: string;
  /** Condition/quantity note, e.g. "scratched", "x2". */
  note: string | null;
  /** Set when the item is handed back; null while the shop holds it. */
  returned_at: string | null;
}

/* ---------- Ticket ---------- */

/** A part or labour line consumed by the job. Prices in pesos. */
export interface TicketLine {
  uuid: string;
  /** Product uuid when drawn from inventory; null for ad-hoc labour. */
  product_uuid: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  /** Server-computed quantity × unit_price. */
  line_total?: number;
  kind: "part" | "labor";
}

export interface ServiceTicket {
  uuid: string;
  /** Display number, e.g. "JO-IMMS-202609-0001". Allocated per store by the server. */
  ticket_number: string;
  /**
   * Short code printed on the customer's stub and quoted at pickup. Deliberately separate
   * from the job number: it is the thing a claimant can produce without the paperwork.
   */
  claim_code: string;
  status: TicketStatus;
  customer_uuid: string | null;
  /** Denormalised so a ticket still reads correctly if the customer record changes. */
  customer_name: string;
  vehicle_uuid: string | null;
  vehicle_label: string;
  /** What the customer reported. */
  complaint: string;
  /** What the technician found. */
  diagnosis: string | null;
  assigned_to: string | null;
  bay: string | null;
  odometer_in: number | null;
  odometer_out: number | null;
  /** Walk-around damage noted at intake. */
  condition_notes: string[];
  /** Quoted price in pesos, agreed before work starts. */
  estimate: number;
  /** Collected so far, in pesos. */
  paid: number;
  /** Server-computed outstanding amount, in pesos. */
  balance_due: number;
  warranty_days: number;
  /** Customer property held with the vehicle. Absent unless the endpoint eager-loads it. */
  property: CustodyItem[];
  lines: TicketLine[];
  /** Append-only; the server refuses edits and deletions. */
  custody: CustodyEvent[];
  promised_at: string | null;
  released_at: string | null;
  created_at: string;
  updated_at: string;
  /** Set when the job is billed through the POS. */
  sale_uuid: string | null;
}

/**
 * The nested collections are `whenLoaded` server-side, so an endpoint that doesn't eager
 * load them omits the keys entirely. Normalising here keeps every consumer free to treat
 * them as arrays without guarding each access.
 */
function normalize(ticket: ServiceTicket): ServiceTicket {
  return {
    ...ticket,
    condition_notes: ticket.condition_notes ?? [],
    property: ticket.property ?? [],
    lines: ticket.lines ?? [],
    custody: ticket.custody ?? [],
  };
}

/* ---------- Promise dates ---------- */

/**
 * Whole days between the promise date and today. Negative = overdue.
 * Compared at date granularity so a job promised "today" never reads as late.
 */
export function daysUntilPromise(promisedAt: string | null): number | null {
  if (!promisedAt) return null;
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((day(new Date(promisedAt)) - day(new Date())) / 86_400_000);
}

/** "46d late" / "in 2d" / "due today" — the board's at-a-glance urgency line. */
export function promiseLabel(promisedAt: string | null): { text: string; late: boolean } | null {
  const days = daysUntilPromise(promisedAt);
  if (days === null) return null;
  if (days < 0) return { text: `${Math.abs(days)}d late`, late: true };
  if (days === 0) return { text: "due today", late: false };
  return { text: `in ${days}d`, late: false };
}

/**
 * A job nobody has touched in a while. Surfaced as a STALLED pill so a quiet ticket can't
 * hide behind a reassuring column.
 */
export function isStalled(ticket: ServiceTicket, thresholdDays = 3): boolean {
  if (!isOpenStatus(ticket.status)) return false;
  const last = ticket.custody[ticket.custody.length - 1]?.at ?? ticket.updated_at;
  return (Date.now() - new Date(last).getTime()) / 86_400_000 >= thresholdDays;
}

/* ---------- Money ---------- */

/** Parts + labour total in pesos. VAT is applied by the POS at checkout, not here. */
export function ticketTotal(ticket: ServiceTicket): number {
  return (ticket.lines ?? []).reduce((sum, l) => sum + l.quantity * l.unit_price, 0);
}

/**
 * Amount still owed. Prefers the server's own figure — it is computed from the authoritative
 * centavo columns — and only falls back to arithmetic when the field is absent.
 */
export function balanceDue(ticket: ServiceTicket): number {
  if (typeof ticket.balance_due === "number") return ticket.balance_due;
  return Math.max(0, ticket.estimate + ticketTotal(ticket) - ticket.paid);
}

/* ---------- Reads ---------- */

export interface ListTicketsParams {
  status?: TicketStatus;
  /** Only tickets still in a bay. */
  openOnly?: boolean;
  customerUuid?: string;
  vehicleUuid?: string;
  /** Matches ticket number, claim code, customer name, vehicle label or complaint. */
  q?: string;
}

export async function listTickets(params: ListTicketsParams = {}): Promise<ServiceTicket[]> {
  const rows = await apiRequest<ServiceTicket[]>("/service-tickets", {
    params: {
      status: params.status,
      open_only: params.openOnly ? 1 : undefined,
      customer_uuid: params.customerUuid,
      vehicle_uuid: params.vehicleUuid,
      q: params.q,
    },
  });
  return (rows ?? []).map(normalize);
}

export async function getTicket(uuid: string): Promise<ServiceTicket | null> {
  try {
    return normalize(await apiRequest<ServiceTicket>(`/service-tickets/${uuid}`));
  } catch {
    return null;
  }
}

/** Looks a ticket up by job number or claim code. Null when nothing matches. */
export async function findTicketByCode(code: string): Promise<ServiceTicket | null> {
  const needle = code.trim();
  if (!needle) return null;
  try {
    return normalize(await apiRequest<ServiceTicket>(`/service-tickets/code/${encodeURIComponent(needle)}`));
  } catch {
    return null;
  }
}

/** Count of tickets per status, for the dashboard and the sidebar badge. */
export async function getTicketCounts(): Promise<{ open: number; byStatus: Record<string, number> }> {
  const res = await apiRequest<{ open: number; by_status: Record<string, number> }>("/service-tickets/counts");
  return { open: res?.open ?? 0, byStatus: res?.by_status ?? {} };
}

/* ---------- Writes ---------- */

/**
 * Identity of whoever is performing an action.
 *
 * The server derives the actor from the bearer token, so this is no longer sent — it is
 * kept in the signatures because every call site passes one, and removing the parameter
 * would be a churn-only change across eight files.
 */
export interface Actor {
  uuid: string | null;
  name: string;
}

export interface CreateTicketPayload {
  customer_uuid: string | null;
  customer_name: string;
  vehicle_uuid: string | null;
  vehicle_label: string;
  complaint: string;
  odometer_in?: number | null;
  bay?: string | null;
  assigned_to?: string | null;
  promised_at?: string | null;
  /** Property checked in with the vehicle, as label/note pairs. */
  property?: { label: string; note?: string | null }[];
  /** Who physically handed the vehicle over. */
  released_by?: string | null;
  condition_notes?: string[];
  estimate?: number;
  paid?: number;
  warranty_days?: number;
}

/** Opens a ticket; the server writes its opening `intake` custody event in the same step. */
export async function createTicket(payload: CreateTicketPayload, _actor?: Actor): Promise<ServiceTicket> {
  return normalize(await apiRequest<ServiceTicket>("/service-tickets", { method: "POST", body: payload }));
}

export async function advanceStatus(
  uuid: string,
  status: TicketStatus,
  _actor?: Actor,
  detail?: string
): Promise<ServiceTicket> {
  return normalize(
    await apiRequest<ServiceTicket>(`/service-tickets/${uuid}/status`, {
      method: "PUT",
      body: { status, detail: detail?.trim() || undefined },
    })
  );
}

export async function assignTicket(
  uuid: string,
  assignee: string,
  bay: string | null,
  _actor?: Actor
): Promise<ServiceTicket> {
  return normalize(
    await apiRequest<ServiceTicket>(`/service-tickets/${uuid}/assign`, {
      method: "PUT",
      body: { assigned_to: assignee.trim() || null, bay: bay?.trim() || null },
    })
  );
}

export async function setDiagnosis(uuid: string, diagnosis: string, _actor?: Actor): Promise<ServiceTicket> {
  return normalize(
    await apiRequest<ServiceTicket>(`/service-tickets/${uuid}/diagnosis`, {
      method: "PUT",
      body: { diagnosis: diagnosis.trim() || null },
    })
  );
}

export async function addNote(uuid: string, note: string, _actor?: Actor): Promise<ServiceTicket> {
  return normalize(
    await apiRequest<ServiceTicket>(`/service-tickets/${uuid}/notes`, { method: "POST", body: { note: note.trim() } })
  );
}

export async function addLine(uuid: string, line: Omit<TicketLine, "uuid">, _actor?: Actor): Promise<ServiceTicket> {
  return normalize(
    await apiRequest<ServiceTicket>(`/service-tickets/${uuid}/lines`, {
      method: "POST",
      body: {
        product_uuid: line.product_uuid ?? undefined,
        kind: line.kind,
        description: line.description,
        quantity: line.quantity,
        unit_price: line.unit_price,
      },
    })
  );
}

export async function removeLine(uuid: string, lineUuid: string, _actor?: Actor): Promise<ServiceTicket> {
  return normalize(
    await apiRequest<ServiceTicket>(`/service-tickets/${uuid}/lines/${lineUuid}`, { method: "DELETE" })
  );
}

export async function addProperty(
  uuid: string,
  label: string,
  note: string | null,
  _actor?: Actor
): Promise<ServiceTicket> {
  return normalize(
    await apiRequest<ServiceTicket>(`/service-tickets/${uuid}/property`, {
      method: "POST",
      body: { label: label.trim(), note: note?.trim() || undefined },
    })
  );
}

/** Marks one property item handed back. The record of having held it stands. */
export async function returnProperty(uuid: string, itemUuid: string, _actor?: Actor): Promise<ServiceTicket> {
  return normalize(
    await apiRequest<ServiceTicket>(`/service-tickets/${uuid}/property/${itemUuid}/return`, { method: "PUT" })
  );
}

export interface ReleasePayload {
  /** Who collected the vehicle. */
  received_by: string;
  odometer_out?: number | null;
  notes?: string | null;
  /** Balance collected at the counter as the unit goes out, in pesos. */
  collected?: number;
  payment_method?: string;
}

/**
 * Closes the chain of custody. Any property still held is marked returned in the same step,
 * so a released ticket never leaves items outstanding.
 */
export async function releaseTicket(uuid: string, payload: ReleasePayload, _actor?: Actor): Promise<ServiceTicket> {
  return normalize(
    await apiRequest<ServiceTicket>(`/service-tickets/${uuid}/release`, {
      method: "POST",
      body: {
        received_by: payload.received_by.trim(),
        odometer_out: payload.odometer_out ?? undefined,
        notes: payload.notes?.trim() || undefined,
        collected: payload.collected ?? undefined,
        payment_method: payload.payment_method,
      },
    })
  );
}

export async function cancelTicket(uuid: string, reason: string, _actor?: Actor): Promise<ServiceTicket> {
  return normalize(
    await apiRequest<ServiceTicket>(`/service-tickets/${uuid}/cancel`, {
      method: "POST",
      body: { reason: reason.trim() || undefined },
    })
  );
}

/** Links a ticket to the sale that billed it. */
export async function attachSale(
  uuid: string,
  saleUuid: string,
  _saleNumber?: string,
  _actor?: Actor
): Promise<ServiceTicket> {
  return normalize(
    await apiRequest<ServiceTicket>(`/service-tickets/${uuid}/attach-sale`, {
      method: "POST",
      body: { sale_uuid: saleUuid },
    })
  );
}

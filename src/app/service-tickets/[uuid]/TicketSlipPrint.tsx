"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button, Modal } from "@/components/ui";
import { useAuthStore } from "@/lib/auth-store";
import { formatDateTime } from "@/lib/utils";
import { TICKET_STATUS_LABELS, ticketTotal, type ServiceTicket } from "@/lib/api/service-tickets";

/**
 * Printable intake / release slip — the paper half of the chain of custody, signed by both
 * sides. Uses the `#statement-print` id so it inherits the existing print stylesheet in
 * globals.css (which isolates the printable area and restores light tokens).
 */
export function TicketSlipPrint({
  ticket,
  kind,
  money,
  onClose,
}: {
  ticket: ServiceTicket;
  kind: "intake" | "release";
  money: (n: number) => string;
  onClose: () => void;
}) {
  const store = useAuthStore((s) => s.user?.store);
  const isRelease = kind === "release";

  // Esc closes; handled by Modal, but the print shortcut is convenient here.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault();
        window.print();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const releaseEvent = [...ticket.custody].reverse().find((e) => e.type === "release");

  return (
    <Modal
      open
      onClose={onClose}
      title={isRelease ? "Release slip" : "Intake slip"}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.print()}>
            <Printer size={15} /> Print
          </Button>
        </>
      }
    >
      <div id="statement-print" className="bg-white p-6 text-[#000]">
        {/* Letterhead */}
        <div className="flex items-start justify-between border-b-2 border-[#000] pb-3">
          <div>
            <p className="text-lg font-bold tracking-tight">{store?.name ?? "ImmerSons AutoMoto"}</p>
            <p className="text-[11px]">Tires · Mags · Batteries · Parts · Accessories · PMS</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold uppercase">{isRelease ? "Release Slip" : "Vehicle Intake Slip"}</p>
            <p className="font-mono text-xs">{ticket.ticket_number}</p>
            {/* The stub's whole purpose: the code the customer quotes at pickup. */}
            <p className="mt-1 font-mono text-base font-bold tracking-[0.25em]">{ticket.claim_code}</p>
            <p className="text-[9px] uppercase tracking-wide">Claim code</p>
          </div>
        </div>

        {/* Parties */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-[12px]">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide">Customer</p>
            <p>{ticket.customer_name}</p>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide">Vehicle</p>
            <p className="font-mono">{ticket.vehicle_label}</p>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide">Received</p>
            <p>{formatDateTime(ticket.created_at)}</p>
            {ticket.odometer_in != null && <p>Odometer in: {ticket.odometer_in.toLocaleString()} km</p>}
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide">Status</p>
            <p>{TICKET_STATUS_LABELS[ticket.status]}</p>
            {ticket.promised_at && <p>Promised: {formatDateTime(ticket.promised_at)}</p>}
            {ticket.released_at && <p>Released: {formatDateTime(ticket.released_at)}</p>}
            {releaseEvent?.odometer_km != null && <p>Odometer out: {releaseEvent.odometer_km.toLocaleString()} km</p>}
            {ticket.warranty_days > 0 && <p>Warranty: {ticket.warranty_days} days on the repair</p>}
          </div>
        </div>

        {/* Complaint */}
        <div className="mt-4 text-[12px]">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide">Reported complaint</p>
          <p>{ticket.complaint || "—"}</p>
          {ticket.diagnosis && (
            <>
              <p className="mb-1 mt-2 text-[10px] font-bold uppercase tracking-wide">Findings</p>
              <p>{ticket.diagnosis}</p>
            </>
          )}
        </div>

        {/* Walk-around damage agreed at the door */}
        {ticket.condition_notes.length > 0 && (
          <div className="mt-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide">Condition at intake</p>
            <p className="text-[12px]">{ticket.condition_notes.join(" · ")}</p>
          </div>
        )}

        {/* Property checklist — the reason the slip exists */}
        <div className="mt-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide">Customer property held</p>
          {ticket.property.length === 0 ? (
            <p className="text-[12px]">None declared.</p>
          ) : (
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-[#000]/40">
                  <th className="py-1 text-left font-semibold">Item</th>
                  <th className="py-1 text-left font-semibold">Condition / qty</th>
                  <th className="py-1 text-right font-semibold">Returned</th>
                </tr>
              </thead>
              <tbody>
                {ticket.property.map((p) => (
                  <tr key={p.uuid} className="border-b border-[#000]/15">
                    <td className="py-1">{p.label}</td>
                    <td className="py-1">{p.note ?? "—"}</td>
                    <td className="py-1 text-right">{p.returned_at ? formatDateTime(p.returned_at) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Charges, on the release slip only */}
        {isRelease && ticket.lines.length > 0 && (
          <div className="mt-4">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide">Parts & labour</p>
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-[#000]/40">
                  <th className="py-1 text-left font-semibold">Description</th>
                  <th className="py-1 text-right font-semibold">Qty</th>
                  <th className="py-1 text-right font-semibold">Unit</th>
                  <th className="py-1 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {ticket.lines.map((l) => (
                  <tr key={l.uuid} className="border-b border-[#000]/15">
                    <td className="py-1">{l.description}</td>
                    <td className="py-1 text-right">{l.quantity}</td>
                    <td className="py-1 text-right">{money(l.unit_price)}</td>
                    <td className="py-1 text-right">{money(l.quantity * l.unit_price)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="py-1.5 text-right font-bold">
                    Total (before VAT)
                  </td>
                  <td className="py-1.5 text-right font-bold">{money(ticketTotal(ticket))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Custody trail */}
        <div className="mt-4">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide">Chain of custody</p>
          <table className="w-full border-collapse text-[11px]">
            <tbody>
              {ticket.custody.map((e) => (
                <tr key={e.uuid} className="border-b border-[#000]/15">
                  <td className="w-36 py-1 align-top">{formatDateTime(e.at)}</td>
                  <td className="py-1 align-top">
                    <span className="font-medium">{e.summary}</span>
                    {e.detail && <span className="block">{e.detail}</span>}
                    <span className="block text-[10px]">
                      by {e.actor_name}
                      {e.released_by && ` · released by ${e.released_by}`}
                      {e.received_by && ` · received by ${e.received_by}`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="mt-8 grid grid-cols-2 gap-8 text-[11px]">
          <div>
            <div className="border-t border-[#000] pt-1">
              {isRelease ? "Released by (shop)" : "Received by (shop)"}
            </div>
          </div>
          <div>
            <div className="border-t border-[#000] pt-1">
              {isRelease ? "Received by (customer)" : "Released by (customer)"}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-[10px]">
          {isRelease
            ? "I confirm I have received the vehicle and all property listed above in acceptable condition."
            : "I authorise the shop to hold the vehicle and the property listed above for the work described."}
        </p>
      </div>
    </Modal>
  );
}

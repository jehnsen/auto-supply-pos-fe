"use client";

import { useCallback, useEffect, useState } from "react";

import Link from "next/link";
import { Car, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import {
  createVehicle,
  deleteVehicle,
  listVehicles,
  updateVehicle,
  VEHICLE_KIND_LABELS,
  type Vehicle,
  type VehicleKind,
} from "@/lib/api/vehicles";
import { listTickets, TICKET_STATUS_LABELS, TICKET_STATUS_TONES, type ServiceTicket } from "@/lib/api/service-tickets";
import { formatDate } from "@/lib/utils";
import { Badge, Button, ConfirmDialog, Field, Input, Modal, Select, Spinner } from "@/components/ui";

/**
 * A customer's vehicles, with each unit's service history inline.
 *
 * Vehicles and tickets are browser-persisted (the backend has no endpoints for them yet),
 * so this panel degrades to an empty state rather than erroring when nothing is stored.
 */
export function CustomerVehicles({ customerUuid, customerName }: { customerUuid: string; customerName: string }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);

  const load = useCallback(async () => {
    try {
      const [rows, ticketRows] = await Promise.all([
        listVehicles(customerUuid),
        listTickets({ customerUuid }),
      ]);
      setVehicles(rows);
      setTickets(ticketRows);
    } finally {
      setLoading(false);
    }
  }, [customerUuid]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-black/[0.07] p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Vehicles</h3>
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)}>
          <Plus size={13} /> Add vehicle
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Spinner size="md" />
        </div>
      ) : vehicles.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 py-10 text-center">
          <Car size={26} className="text-ink-muted" />
          <p className="text-sm font-medium text-ink-secondary">No vehicles on file</p>
          <p className="text-xs text-ink-muted">Add one to open job orders against it.</p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-black/[0.06]">
          {vehicles.map((v) => {
            const history = tickets.filter((t) => t.vehicle_uuid === v.uuid);
            return (
              <div key={v.uuid} className="p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold">{v.plate}</p>
                    <p className="text-xs text-ink-secondary">
                      {[v.year, v.make, v.model].filter(Boolean).join(" ")}
                      {v.color ? ` · ${v.color}` : ""}
                      <span className="ml-1.5 text-ink-muted">· {VEHICLE_KIND_LABELS[v.kind]}</span>
                    </p>
                    {v.odometer_km != null && (
                      <p className="text-[11px] text-ink-muted">Last odometer: {v.odometer_km.toLocaleString()} km</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(v)} aria-label={`Edit ${v.plate}`}>
                      <Pencil size={13} />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(v)} aria-label={`Remove ${v.plate}`}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>

                {history.length > 0 && (
                  <div className="mt-2 flex flex-col gap-1">
                    {history.slice(0, 4).map((t) => (
                      <Link
                        key={t.uuid}
                        href={`/service-tickets/${t.uuid}`}
                        prefetch={false}
                        className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs transition-colors hover:bg-black/[0.03]"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <Wrench size={11} className="shrink-0 text-ink-muted" />
                          <span className="font-mono font-medium text-brand-strong">{t.ticket_number}</span>
                          <span className="truncate text-ink-secondary">{t.complaint}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2">
                          <Badge tone={TICKET_STATUS_TONES[t.status]}>{TICKET_STATUS_LABELS[t.status]}</Badge>
                          <span className="text-ink-muted">{formatDate(t.created_at)}</span>
                        </span>
                      </Link>
                    ))}
                    {history.length > 4 && (
                      <p className="px-2 text-[11px] text-ink-muted">+{history.length - 4} more job orders</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mounted only while open so the form seeds from `editing` without a reset effect. */}
      {(adding || editing !== null) && (
        <VehicleFormModal
          vehicle={editing}
          customerName={customerName}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSave={async (payload) => {
            if (editing) await updateVehicle(editing.uuid, payload);
            else await createVehicle({ ...payload, customer_uuid: customerUuid });
            setAdding(false);
            setEditing(null);
            load();
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting) {
            await deleteVehicle(deleting.uuid);
            load();
          }
        }}
        title="Remove this vehicle?"
        message={
          deleting
            ? `${deleting.plate} will be removed from this customer. Existing job orders keep their record of it.`
            : ""
        }
        confirmLabel="Remove"
      />
    </div>
  );
}

type VehicleFormPayload = Omit<Parameters<typeof createVehicle>[0], "customer_uuid">;

function VehicleFormModal({
  vehicle,
  customerName,
  onClose,
  onSave,
}: {
  vehicle: Vehicle | null;
  customerName: string;
  onClose: () => void;
  onSave: (payload: VehicleFormPayload) => Promise<void>;
}) {
  const [kind, setKind] = useState<VehicleKind>(vehicle?.kind ?? "motorcycle");
  const [plate, setPlate] = useState(vehicle?.plate ?? "");
  const [make, setMake] = useState(vehicle?.make ?? "");
  const [model, setModel] = useState(vehicle?.model ?? "");
  const [year, setYear] = useState(vehicle?.year != null ? String(vehicle.year) : "");
  const [color, setColor] = useState(vehicle?.color ?? "");
  const [odometer, setOdometer] = useState(vehicle?.odometer_km != null ? String(vehicle.odometer_km) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await onSave({
        kind,
        plate,
        make,
        model,
        year: year.trim() ? Number(year) : null,
        color: color.trim() || null,
        odometer_km: odometer.trim() ? Number(odometer) : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the vehicle");
    } finally {
      setSaving(false);
    }
  }

  const canSubmit = plate.trim() && make.trim() && model.trim() && !saving;

  return (
    <Modal
      open
      onClose={onClose}
      title={vehicle ? `Edit ${vehicle.plate}` : `Add a vehicle for ${customerName}`}
      width="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={submit}>
            {saving ? "Saving…" : "Save vehicle"}
          </Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type">
          <Select value={kind} onChange={(e) => setKind(e.target.value as VehicleKind)}>
            {(Object.keys(VEHICLE_KIND_LABELS) as VehicleKind[]).map((k) => (
              <option key={k} value={k}>
                {VEHICLE_KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Plate / conduction no.">
          <Input autoFocus value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="ABC-1234" />
        </Field>
        <Field label="Make">
          <Input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Honda" />
        </Field>
        <Field label="Model">
          <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Rebel 500" />
        </Field>
        <Field label="Year">
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2022" />
        </Field>
        <Field label="Color">
          <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Matte black" />
        </Field>
        <Field label="Odometer (km)" className="col-span-2">
          <Input type="number" min={0} value={odometer} onChange={(e) => setOdometer(e.target.value)} placeholder="42118" />
        </Field>
      </div>
    </Modal>
  );
}

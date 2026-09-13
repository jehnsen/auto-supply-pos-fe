"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, Plus, UserPlus } from "lucide-react";
import { CustomerPicker } from "@/components/CustomerPicker";
import { VehiclePicker } from "@/components/VehiclePicker";
import { CounterHeader } from "@/components/CounterHeader";
import { Caption, Chip, DataRow, Panel } from "@/components/panel";
import { Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { createVehicle, describeVehicle, VEHICLE_KIND_LABELS, type Vehicle, type VehicleKind } from "@/lib/api/vehicles";
import { createTicket } from "@/lib/api/service-tickets";
import { useAuthStore } from "@/lib/auth-store";
import type { Customer } from "@/lib/api/customers";
import { cx, formatDate } from "@/lib/utils";

/** Common complaints, tapped instead of typed when the counter is busy. */
const COMPLAINT_TAGS = [
  "Won't start",
  "Overheating",
  "Brake noise",
  "Check engine light",
  "Aircon not cold",
  "Vibration at speed",
  "Oil leak",
  "Battery drains",
  "Due for PMS",
  "Tire / wheel",
];

/** Walk-around damage noted before the unit is accepted. */
const CONDITION_TAGS = [
  "Bumper scuffed",
  "Windshield chipped",
  "Dent on door",
  "Scratches on panel",
  "Mirror cracked",
  "Warning light on",
  "Tires worn",
  "Interior soiled",
];

/** Items the customer leaves with the vehicle. */
const TURNOVER_TAGS = ["Spare tire", "Jack & tools", "Stereo faceplate", "Dashcam", "Personal items", "OR / CR copy"];

const WARRANTY_OPTIONS = [0, 7, 15, 30, 60, 90];

const PAYMENT_METHODS = ["Cash", "GCash", "Maya", "Card", "Bank transfer"];

/** Default promise: tomorrow, as an ISO date for <input type="date">. */
function tomorrowISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function IntakePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const currency = user?.store.currency ?? "PHP";
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [addingVehicle, setAddingVehicle] = useState(false);

  const [complaint, setComplaint] = useState("");
  const [complaintTags, setComplaintTags] = useState<string[]>([]);
  const [odometer, setOdometer] = useState("");
  const [fuel, setFuel] = useState("half");
  const [conditionTags, setConditionTags] = useState<string[]>([]);
  const [turnover, setTurnover] = useState<string[]>([]);

  const [estimate, setEstimate] = useState("");
  const [downpayment, setDownpayment] = useState("");
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [promisedAt, setPromisedAt] = useState(tomorrowISO());
  const [technician, setTechnician] = useState("");
  const [bay, setBay] = useState("");
  const [warrantyDays, setWarrantyDays] = useState(30);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Switching customers invalidates the vehicle — it belongs to the previous owner. */
  function chooseCustomer(next: Customer | null) {
    setCustomer(next);
    setVehicle(null);
  }

  function toggle(list: string[], set: (v: string[]) => void, value: string) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  const estimateNum = Number(estimate) || 0;
  const downNum = Number(downpayment) || 0;
  const balance = Math.max(0, estimateNum - downNum);

  const missing = useMemo(() => {
    const gaps: string[] = [];
    if (!customer) gaps.push("customer");
    if (!vehicle) gaps.push("vehicle");
    if (!complaint.trim() && complaintTags.length === 0) gaps.push("reported problem");
    if (estimateNum <= 0) gaps.push("estimate");
    return gaps;
  }, [customer, vehicle, complaint, complaintTags, estimateNum]);

  const canSubmit = missing.length === 0 && !saving;

  async function submit() {
    if (!customer || !vehicle) return;
    setSaving(true);
    setError(null);
    try {
      // Tapped tags and free text describe the same complaint; join them into one line.
      const fullComplaint = [complaintTags.join(", "), complaint.trim()].filter(Boolean).join(" — ");
      const ticket = await createTicket(
        {
          customer_uuid: customer.uuid,
          customer_name: customer.name,
          vehicle_uuid: vehicle.uuid,
          vehicle_label: describeVehicle(vehicle),
          complaint: fullComplaint,
          odometer_in: odometer.trim() ? Number(odometer) : null,
          bay: bay.trim() || null,
          assigned_to: technician.trim() || null,
          released_by: customer.name,
          promised_at: promisedAt ? new Date(promisedAt).toISOString() : null,
          condition_notes: [...conditionTags, `Fuel: ${fuel}`],
          estimate: estimateNum,
          paid: downNum,
          warranty_days: warrantyDays,
          property: turnover.map((label) => ({ label, note: null })),
        },
        { uuid: user?.uuid ?? null, name: user?.name ?? "Staff" }
      );
      router.push(`/service-tickets/${ticket.uuid}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the job order");
      setSaving(false);
    }
  }

  return (
    <div className="p-6">
      <CounterHeader
        title="New job order"
        subtitle="Take a unit in: customer, vehicle, reported problem, condition, then commercials."
        aside={formatDate(new Date().toISOString())}
      />

      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-status-critical">{error}</p>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
        {/* ---- Left: the sequenced intake ---- */}
        <div className="flex min-w-0 flex-col gap-4">
          <Panel label="Customer" step={1}>
            <div className="rounded-lg border border-black/10 bg-card px-2 py-1.5">
              <CustomerPicker value={customer} onChange={chooseCustomer} />
            </div>
            {customer && (
              <p className="mt-2 text-xs text-ink-muted">
                {customer.code}
                {customer.phone ? ` · ${customer.phone}` : ""}
                {customer.total_outstanding > 0 && (
                  <span className="ml-1.5 text-status-warning">
                    · {money(customer.total_outstanding)} outstanding on account
                  </span>
                )}
              </p>
            )}
          </Panel>

          <Panel
            label="Vehicle"
            step={2}
            actions={
              <Button size="sm" variant="secondary" disabled={!customer} onClick={() => setAddingVehicle(true)}>
                <Plus size={13} /> Add vehicle
              </Button>
            }
          >
            <VehiclePicker
              customerUuid={customer?.uuid ?? null}
              value={vehicle}
              onChange={setVehicle}
              onAddNew={() => setAddingVehicle(true)}
            />
            {vehicle && (
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                <Spec label="Plate" value={vehicle.plate} mono />
                <Spec label="Make" value={vehicle.make} />
                <Spec label="Model" value={vehicle.model} />
                <Spec label="Year" value={vehicle.year ? String(vehicle.year) : "—"} />
                {vehicle.vin && <Spec label="VIN" value={vehicle.vin} mono />}
                {vehicle.color && <Spec label="Colour" value={vehicle.color} />}
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Odometer in (km)">
                <Input
                  type="number"
                  min={0}
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  placeholder="42118"
                />
              </Field>
              <Field label="Fuel level">
                <Select value={fuel} onChange={(e) => setFuel(e.target.value)}>
                  <option value="empty">Empty</option>
                  <option value="quarter">1/4</option>
                  <option value="half">1/2</option>
                  <option value="three-quarters">3/4</option>
                  <option value="full">Full</option>
                </Select>
              </Field>
            </div>
          </Panel>

          <Panel label="Reported problem" step={3}>
            <Caption className="mb-2">What the customer said</Caption>
            <Textarea
              value={complaint}
              onChange={(e) => setComplaint(e.target.value)}
              placeholder="In their words — e.g. “Nag-o-overheat pag matagal sa traffic, tapos may tunog sa harap kapag preno.”"
              className="min-h-20"
            />
            <Caption className="mb-2 mt-3">Quick tags</Caption>
            <div className="flex flex-wrap gap-1.5">
              {COMPLAINT_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  selected={complaintTags.includes(tag)}
                  onClick={() => toggle(complaintTags, setComplaintTags, tag)}
                >
                  {tag}
                </Chip>
              ))}
            </div>
          </Panel>

          <Panel label="Condition at intake" step={4}>
            <p className="mb-3 text-xs leading-relaxed text-ink-muted">
              Walk around the unit with the customer before accepting it. Anything already damaged goes here — it is what
              you both point at when the vehicle goes back out.
            </p>
            <Caption className="mb-2">Damage noted</Caption>
            <div className="flex flex-wrap gap-1.5">
              {CONDITION_TAGS.map((tag) => (
                <Chip
                  key={tag}
                  selected={conditionTags.includes(tag)}
                  onClick={() => toggle(conditionTags, setConditionTags, tag)}
                >
                  {tag}
                </Chip>
              ))}
            </div>
            <Caption className="mb-2 mt-4">Turned over with the unit</Caption>
            <div className="flex flex-wrap gap-1.5">
              {TURNOVER_TAGS.map((tag) => (
                <Chip key={tag} selected={turnover.includes(tag)} onClick={() => toggle(turnover, setTurnover, tag)}>
                  {tag}
                </Chip>
              ))}
            </div>
          </Panel>
        </div>

        {/* ---- Right: commercials, sticky so the total stays in view ---- */}
        <div className="xl:sticky xl:top-6 xl:self-start">
          <Panel label="Commercials" step={5}>
            <Field label="Estimated cost">
              <Input
                type="number"
                min={0}
                step="0.01"
                value={estimate}
                onChange={(e) => setEstimate(e.target.value)}
                placeholder="0.00"
                className="tabular"
              />
            </Field>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Downpayment">
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={downpayment}
                  onChange={(e) => setDownpayment(e.target.value)}
                  placeholder="0.00"
                  className="tabular"
                />
              </Field>
              <Field label="Method">
                <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Promise date" className="mt-3">
              <Input type="date" value={promisedAt} onChange={(e) => setPromisedAt(e.target.value)} />
            </Field>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Technician">
                <Input value={technician} onChange={(e) => setTechnician(e.target.value)} placeholder="Unassigned" />
              </Field>
              <Field label="Bay">
                <Input value={bay} onChange={(e) => setBay(e.target.value)} placeholder="—" />
              </Field>
            </div>

            <Caption className="mb-1.5 mt-4">Warranty on repair</Caption>
            <div className="grid grid-cols-3 gap-1.5">
              {WARRANTY_OPTIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setWarrantyDays(d)}
                  className={cx(
                    "rounded-lg border py-1.5 text-xs font-medium transition-colors cursor-pointer",
                    warrantyDays === d
                      ? "border-brand bg-brand-soft text-brand-strong"
                      : "border-black/10 text-ink-secondary hover:border-black/25"
                  )}
                >
                  {d === 0 ? "None" : `${d}d`}
                </button>
              ))}
            </div>

            <div className="mt-4 border-t border-black/[0.07] pt-2">
              <DataRow label="Balance due at intake" value={money(balance)} strong critical={balance > 0} />
            </div>

            <Button size="lg" className="mt-3 w-full" disabled={!canSubmit} onClick={submit}>
              <ClipboardCheck size={15} />
              {saving ? "Opening…" : "Create job order"}
            </Button>
            <p className="mt-2 text-center text-[11px] leading-relaxed text-ink-muted">
              {missing.length > 0 ? `Still needed: ${missing.join(", ")}.` : "A claim code is printed on the stub."}
            </p>
          </Panel>
        </div>
      </div>

      {addingVehicle && (
        <AddVehicleModal
          customer={customer}
          onClose={() => setAddingVehicle(false)}
          onCreated={(v) => {
            setVehicle(v);
            setAddingVehicle(false);
          }}
        />
      )}
    </div>
  );
}

function Spec({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={cx("truncate text-ink", mono && "font-mono")}>{value}</p>
    </div>
  );
}

function AddVehicleModal({
  customer,
  onClose,
  onCreated,
}: {
  customer: Customer | null;
  onClose: () => void;
  onCreated: (vehicle: Vehicle) => void;
}) {
  const [kind, setKind] = useState<VehicleKind>("car");
  const [plate, setPlate] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [color, setColor] = useState("");
  const [vin, setVin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!customer) return;
    setSaving(true);
    setError(null);
    try {
      onCreated(
        await createVehicle({
          customer_uuid: customer.uuid,
          kind,
          plate,
          make,
          model,
          year: year.trim() ? Number(year) : null,
          color: color.trim() || null,
          vin: vin.trim() || null,
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the vehicle");
      setSaving(false);
    }
  }

  const canSubmit = !!customer && plate.trim() && make.trim() && model.trim() && !saving;

  return (
    <Modal
      open
      onClose={onClose}
      title={customer ? `Add a vehicle for ${customer.name}` : "Add a vehicle"}
      width="max-w-lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={submit}>
            <UserPlus size={14} /> {saving ? "Saving…" : "Save vehicle"}
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
          <Input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Toyota" />
        </Field>
        <Field label="Model">
          <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Vios" />
        </Field>
        <Field label="Year">
          <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2019" />
        </Field>
        <Field label="Colour">
          <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Silver" />
        </Field>
        <Field label="VIN / chassis (optional)" className="col-span-2">
          <Input value={vin} onChange={(e) => setVin(e.target.value)} placeholder="17-character VIN, or the chassis no." />
        </Field>
      </div>
    </Modal>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, MapPin, Plus, Truck, UserCog } from "lucide-react";
import {
  assignDriver,
  createDelivery,
  getTodaySchedule,
  listDeliveries,
  updateDeliveryStatus,
  type Delivery,
  type DeliveryStatus,
} from "@/lib/api/deliveries";
import { listCustomers, type Customer } from "@/lib/api/customers";
import { listSales, type Sale } from "@/lib/api/sales";
import { listUsers, type StoreUser } from "@/lib/api/settings";
import { ApiError } from "@/lib/api/client";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  Badge,
  Button,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Segmented,
  Select,
  Spinner,
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/ui";

const PER_PAGE = 15;

const statusTone: Record<DeliveryStatus, "neutral" | "brand" | "good" | "critical" | "warning"> = {
  preparing: "neutral",
  dispatched: "brand",
  in_transit: "warning",
  delivered: "good",
  failed: "critical",
};

const statusLabels: Record<DeliveryStatus, string> = {
  preparing: "Preparing",
  dispatched: "Dispatched",
  in_transit: "In transit",
  delivered: "Delivered",
  failed: "Failed",
};

export default function DeliveriesPage() {
  const [view, setView] = useState<"today" | "all">("today");
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [lastPage, setLastPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<Delivery | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  function refetch() {
    setRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        if (view === "today") {
          const items = await getTodaySchedule();
          if (cancelled) return;
          setDeliveries(items);
          setTotal(items.length);
          setLastPage(1);
        } else {
          const res = await listDeliveries({
            page,
            per_page: PER_PAGE,
            status: statusFilter === "all" ? undefined : statusFilter,
          });
          if (cancelled) return;
          setDeliveries(res.items);
          setTotal(res.total);
          setLastPage(res.lastPage);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load deliveries");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [view, page, statusFilter, refreshKey]);

  const canPrev = page > 1;
  const canNext = lastPage !== null ? page < lastPage : deliveries.length === PER_PAGE;

  async function handleStatusChange(d: Delivery, status: DeliveryStatus) {
    setActionBusy(true);
    setActionError(null);
    try {
      const updated = await updateDeliveryStatus(d.uuid, status);
      setViewing(updated);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to update delivery status");
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Deliveries"
        subtitle={total !== null ? `${total} ${total === 1 ? "delivery" : "deliveries"} in view` : undefined}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus size={15} /> Schedule delivery
          </Button>
        }
      />

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.07] p-3">
          <Segmented
            value={view}
            onChange={(v) => {
              setView(v);
              setPage(1);
            }}
            options={[
              { value: "today", label: "Today's schedule" },
              { value: "all", label: "All deliveries" },
            ]}
          />
          {view === "all" && (
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as DeliveryStatus | "all");
                setPage(1);
              }}
              className="w-40"
            >
              <option value="all">All statuses</option>
              {Object.entries(statusLabels).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
          )}
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-2 py-14 text-center">
            <AlertTriangle size={28} className="text-status-critical" />
            <p className="text-sm font-medium text-status-critical">{error}</p>
            <Button variant="secondary" size="sm" onClick={refetch}>
              Retry
            </Button>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-14">
            <Spinner size="md" />
          </div>
        ) : deliveries.length === 0 ? (
          <EmptyState icon={<Truck size={28} />} title="No deliveries found" hint="Schedule a delivery to a customer" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Delivery #</Th>
                <Th>Customer</Th>
                <Th>Status</Th>
                <Th>Scheduled</Th>
                <Th>Driver</Th>
                <Th right />
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <tr key={d.uuid} className="cursor-pointer hover:bg-black/[0.015]" onClick={() => setViewing(d)}>
                  <Td className="font-mono text-xs">{d.delivery_number}</Td>
                  <Td>
                    <p className="font-medium">{d.customer?.name ?? "—"}</p>
                    <p className="text-xs text-ink-muted">{d.delivery_city}</p>
                  </Td>
                  <Td>
                    <Badge tone={statusTone[d.status]}>{statusLabels[d.status]}</Badge>
                  </Td>
                  <Td className="text-ink-secondary">{formatDate(d.scheduled_date)}</Td>
                  <Td className="text-ink-secondary">{d.driver?.name ?? "Unassigned"}</Td>
                  <Td right />
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {view === "all" && !error && !loading && deliveries.length > 0 && (
          <div className="flex items-center justify-between border-t border-black/[0.07] px-3 py-2.5 text-xs text-ink-secondary">
            <span>
              Page {page}
              {lastPage ? ` of ${lastPage}` : ""}
            </span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="secondary" disabled={!canPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button size="sm" variant="secondary" disabled={!canNext} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {creating && (
        <CreateDeliveryModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            refetch();
          }}
        />
      )}

      {viewing && (
        <DeliveryDetailModal
          delivery={viewing}
          actionError={actionError}
          actionBusy={actionBusy}
          onClose={() => {
            setViewing(null);
            setActionError(null);
          }}
          onStatusChange={handleStatusChange}
          onDriverAssigned={(updated) => {
            setViewing(updated);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function DeliveryDetailModal({
  delivery,
  actionError,
  actionBusy,
  onClose,
  onStatusChange,
  onDriverAssigned,
}: {
  delivery: Delivery;
  actionError: string | null;
  actionBusy: boolean;
  onClose: () => void;
  onStatusChange: (d: Delivery, status: DeliveryStatus) => void;
  onDriverAssigned: (d: Delivery) => void;
}) {
  const [drivers, setDrivers] = useState<StoreUser[]>([]);
  const [driverId, setDriverId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  useEffect(() => {
    listUsers(1)
      .then((res) => {
        const driverRoleUsers = res.items.filter((u) => u.role.toLowerCase().includes("driver"));
        setDrivers(driverRoleUsers.length > 0 ? driverRoleUsers : res.items);
      })
      .catch(() => {});
  }, []);

  async function submitAssignDriver() {
    if (!driverId) return;
    setAssigning(true);
    setAssignError(null);
    try {
      const updated = await assignDriver(delivery.uuid, driverId);
      onDriverAssigned(updated);
    } catch (err) {
      setAssignError(err instanceof ApiError ? err.message : "Failed to assign driver");
    } finally {
      setAssigning(false);
    }
  }

  const statusTransitions: Record<DeliveryStatus, { status: DeliveryStatus; label: string }[]> = {
    preparing: [{ status: "dispatched", label: "Mark dispatched" }],
    dispatched: [{ status: "in_transit", label: "Mark in transit" }],
    in_transit: [
      { status: "delivered", label: "Mark delivered" },
      { status: "failed", label: "Mark failed" },
    ],
    delivered: [],
    failed: [],
  };
  const nextStatusOptions = statusTransitions[delivery.status];

  return (
    <Modal open onClose={onClose} title={`Delivery ${delivery.delivery_number}`} width="max-w-2xl">
      {actionError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{actionError}</p>}
      <div className="mb-3 flex items-center justify-between">
        <Badge tone={statusTone[delivery.status]}>{statusLabels[delivery.status]}</Badge>
        <div className="flex gap-2">
          {nextStatusOptions.map((opt) => (
            <Button key={opt.status} size="sm" disabled={actionBusy} onClick={() => onStatusChange(delivery, opt.status)}>
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <p>
          <span className="text-ink-muted">Customer:</span> {delivery.customer?.name ?? "—"}
        </p>
        <p>
          <span className="text-ink-muted">Scheduled:</span> {formatDate(delivery.scheduled_date)}
        </p>
        <p className="col-span-2 flex items-start gap-1.5">
          <MapPin size={14} className="mt-0.5 shrink-0 text-ink-muted" />
          <span>
            {delivery.delivery_address}
            {delivery.delivery_city ? `, ${delivery.delivery_city}` : ""}
            {delivery.delivery_province ? `, ${delivery.delivery_province}` : ""}
          </span>
        </p>
        {delivery.contact_person && (
          <p>
            <span className="text-ink-muted">Contact:</span> {delivery.contact_person} ({delivery.contact_phone})
          </p>
        )}
        {delivery.delivery_instructions && (
          <p className="col-span-2">
            <span className="text-ink-muted">Instructions:</span> {delivery.delivery_instructions}
          </p>
        )}
        {delivery.dispatched_at && (
          <p>
            <span className="text-ink-muted">Dispatched:</span> {formatDateTime(delivery.dispatched_at)}
          </p>
        )}
        {delivery.delivered_at && (
          <p>
            <span className="text-ink-muted">Delivered:</span> {formatDateTime(delivery.delivered_at)}
          </p>
        )}
      </div>

      <div className="mb-4 rounded-lg border border-black/[0.07] p-3">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          <UserCog size={13} /> Driver
        </h3>
        {assignError && <p className="mb-2 text-xs font-medium text-status-critical">{assignError}</p>}
        {delivery.driver ? (
          <p className="text-sm">
            {delivery.driver.name} <span className="text-ink-muted">· {delivery.driver.phone}</span>
          </p>
        ) : (
          <div className="flex gap-2">
            <Select value={driverId} onChange={(e) => setDriverId(e.target.value)} className="flex-1">
              <option value="">Select driver…</option>
              {drivers.map((u) => (
                <option key={u.uuid} value={u.uuid}>
                  {u.name}
                </option>
              ))}
            </Select>
            <Button size="sm" disabled={!driverId || assigning} onClick={submitAssignDriver}>
              {assigning ? "Assigning…" : "Assign"}
            </Button>
          </div>
        )}
      </div>

      {!delivery.items || delivery.items.length === 0 ? (
        <EmptyState icon={<Truck size={24} />} title="Item details are not available for this delivery" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th right>Qty</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {delivery.items.map((item) => (
              <tr key={item.id}>
                <Td>
                  <p className="font-medium">{item.product.name}</p>
                  <p className="font-mono text-xs text-ink-muted">{item.product.sku}</p>
                </Td>
                <Td right>
                  {item.quantity} {item.unit?.abbreviation}
                </Td>
                <Td className="capitalize text-ink-secondary">{item.status}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Modal>
  );
}

function CreateDeliveryModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [sales, setSales] = useState<Sale[]>([]);
  const [saleId, setSaleId] = useState("");
  const [saleSearch, setSaleSearch] = useState("");
  const [loadingSales, setLoadingSales] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [itemQty, setItemQty] = useState<Record<number, number>>({});
  const [selectedSaleItemIds, setSelectedSaleItemIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCustomers({ per_page: 100, is_active: true })
      .then((res) => setCustomers(res.items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingSales(true);
    const handle = setTimeout(() => {
      listSales({
        customer_id: customerId || undefined,
        search: saleSearch.trim() || undefined,
        status: "completed",
        per_page: 50,
      })
        .then((res) => setSales(res.items))
        .catch(() => {})
        .finally(() => setLoadingSales(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [customerId, saleSearch]);

  const selectedSale = sales.find((s) => s.uuid === saleId) ?? null;

  function selectCustomer(uuid: string) {
    setCustomerId(uuid);
    setSaleId("");
    setSelectedSaleItemIds(new Set());
    setItemQty({});
    const c = customers.find((cust) => cust.uuid === uuid);
    if (c?.address) setAddress(c.address);
  }

  function selectSale(uuid: string) {
    setSaleId(uuid);
    const sale = sales.find((s) => s.uuid === uuid);
    if (!customerId) {
      const fallback = sale?.customer
        ? customers.find((cust) => cust.uuid === sale.customer!.uuid)
        : customers.find((cust) => cust.name.trim().toLowerCase() === "walk-in customer");
      if (fallback) {
        setCustomerId(fallback.uuid);
        if (fallback.address) setAddress(fallback.address);
      }
    }
    const nextQty: Record<number, number> = {};
    sale?.items.forEach((it) => {
      nextQty[it.id] = it.quantity;
    });
    setItemQty(nextQty);
    setSelectedSaleItemIds(new Set(sale?.items.map((it) => it.id) ?? []));
  }

  function toggleItem(id: number, checked: boolean) {
    setSelectedSaleItemIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function setQty(id: number, qty: number) {
    setItemQty((prev) => ({ ...prev, [id]: qty }));
  }

  const validItems = (selectedSale?.items ?? [])
    .filter((it) => selectedSaleItemIds.has(it.id))
    .map((it) => ({ sale_item_id: it.id, quantity: itemQty[it.id] ?? 0 }))
    .filter((it) => it.quantity > 0);

  const valid = customerId && saleId && scheduledDate && address.trim() && validItems.length > 0;

  async function submit() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await createDelivery({
        customer_id: customerId,
        sale_id: saleId,
        scheduled_date: scheduledDate,
        delivery_address: address.trim(),
        notes: notes.trim() || undefined,
        items: validItems,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to schedule delivery");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Schedule delivery"
      width="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={!valid || saving} onClick={submit}>
            {saving ? "Scheduling…" : "Schedule delivery"}
          </Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Search sale" className="col-span-2">
          <Input
            value={saleSearch}
            onChange={(e) => setSaleSearch(e.target.value)}
            placeholder="Search by invoice number…"
          />
        </Field>
        <Field label="Customer (optional filter)">
          <Select value={customerId} onChange={(e) => selectCustomer(e.target.value)}>
            <option value="">All customers</option>
            {customers.map((c) => (
              <option key={c.uuid} value={c.uuid}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sale">
          <Select value={saleId} onChange={(e) => selectSale(e.target.value)} disabled={loadingSales}>
            <option value="">{loadingSales ? "Loading sales…" : "Select sale…"}</option>
            {sales.map((s) => (
              <option key={s.uuid} value={s.uuid}>
                {s.sale_number} · {formatDate(s.sale_date)} · {s.customer?.name ?? "No customer"}
              </option>
            ))}
          </Select>
          {!loadingSales && sales.length === 0 && (
            <p className="mt-1 text-xs text-ink-muted">No completed sales found.</p>
          )}
        </Field>
        {selectedSale && !customerId && (
          <p className="col-span-2 -mt-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-status-warning">
            This sale has no customer on file, and no &quot;Walk-in Customer&quot; record exists to fall back to.
            Select a customer above before scheduling.
          </p>
        )}
        <Field label="Scheduled date">
          <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
        </Field>
        <Field label="Delivery address" className="col-span-2">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, province" />
        </Field>
      </div>

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Items</h3>
        {!selectedSale ? (
          <p className="mt-2 text-xs text-ink-muted">Select a sale to choose which items to deliver.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {selectedSale.items.map((item) => {
              const checked = selectedSaleItemIds.has(item.id);
              return (
                <div key={item.id} className="flex items-end gap-2 rounded-lg border border-black/[0.07] p-2">
                  <label className="flex flex-1 items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggleItem(item.id, e.target.checked)}
                      className="h-4 w-4 shrink-0 cursor-pointer accent-brand"
                    />
                    <span className="text-sm">
                      {item.product.name} <span className="text-ink-muted">({item.product.sku})</span>
                    </span>
                  </label>
                  <Field label="Qty" className="w-24">
                    <Input
                      type="number"
                      min={1}
                      max={item.quantity}
                      value={itemQty[item.id] ?? item.quantity}
                      disabled={!checked}
                      onChange={(e) => setQty(item.id, parseFloat(e.target.value) || 0)}
                    />
                  </Field>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3">
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions" />
        </Field>
      </div>
    </Modal>
  );
}

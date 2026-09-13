"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Ban, CheckCircle2, ClipboardList, PackageCheck, Plus, Send, Trash2 } from "lucide-react";
import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  deletePurchaseOrder,
  getPurchaseOrder,
  listPurchaseOrders,
  receivePurchaseOrder,
  submitPurchaseOrder,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from "@/lib/api/purchase-orders";
import { listSuppliers, type Supplier } from "@/lib/api/suppliers";
import { listProducts, type ProductListItem } from "@/lib/api/products";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { cx, formatDate, formatQty, toNum } from "@/lib/utils";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  PromptDialog,
  Select,
  Spinner,
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/ui";

const PER_PAGE = 15;

/** Draft line in the create-PO form; unit_price is in pesos, converted to centavo unit_cost on submit */
interface DraftPOItem {
  key: number;
  product_id: string;
  quantity: number;
  unit_price: number;
}

const statusTone: Record<PurchaseOrderStatus, "neutral" | "brand" | "good" | "critical" | "warning"> = {
  draft: "neutral",
  submitted: "brand",
  partial: "warning",
  received: "good",
  cancelled: "critical",
};

export default function PurchaseOrdersPage() {
  const currency = useAuthStore((s) => s.user?.store.currency) ?? "PHP";
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | "all">("all");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [lastPage, setLastPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<PurchaseOrder | null>(null);
  const [deleting, setDeleting] = useState<PurchaseOrder | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [receiving, setReceiving] = useState<PurchaseOrder | null>(null);
  const [cancelling, setCancelling] = useState<PurchaseOrder | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [viewingLoading, setViewingLoading] = useState(false);

  function updateStatusFilter(v: PurchaseOrderStatus | "all") {
    setStatusFilter(v);
    setPage(1);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await listPurchaseOrders({
          page,
          per_page: PER_PAGE,
          status: statusFilter === "all" ? undefined : statusFilter,
        });
        if (cancelled) return;
        setOrders(res.items);
        setTotal(res.total);
        setLastPage(res.lastPage);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load purchase orders");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [page, statusFilter, refreshKey]);

  function refetch() {
    setRefreshKey((k) => k + 1);
  }

  async function openView(po: PurchaseOrder) {
    setViewing(po);
    setActionError(null);
    setViewingLoading(true);
    try {
      const detail = await getPurchaseOrder(po.uuid);
      setViewing(detail);
    } catch {
      // Keep the list-derived summary if the detail fetch fails.
    } finally {
      setViewingLoading(false);
    }
  }

  const canPrev = page > 1;
  const canNext = lastPage !== null ? page < lastPage : orders.length === PER_PAGE;

  async function handleSubmit(po: PurchaseOrder) {
    setActionBusy(true);
    setActionError(null);
    try {
      const updated = await submitPurchaseOrder(po.uuid);
      setViewing(updated);
      refetch();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to submit purchase order");
    } finally {
      setActionBusy(false);
    }
  }

  function openReceive(po: PurchaseOrder) {
    setActionError(null);
    setReceiving(po);
  }

  function handleCancel(po: PurchaseOrder) {
    setCancelError(null);
    setCancelling(po);
  }

  async function confirmCancel(reason: string) {
    if (!cancelling) return;
    setActionBusy(true);
    setCancelError(null);
    try {
      const updated = await cancelPurchaseOrder(cancelling.uuid, reason);
      setCancelling(null);
      setViewing(updated);
      refetch();
    } catch (err) {
      setCancelError(err instanceof ApiError ? err.message : "Failed to cancel purchase order");
    } finally {
      setActionBusy(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteError(null);
    try {
      await deletePurchaseOrder(deleting.uuid);
      setDeleting(null);
      refetch();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete purchase order");
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Purchase Orders"
        subtitle={total !== null ? `${total} order${total === 1 ? "" : "s"} match the current filters` : undefined}
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus size={15} /> Create PO
          </Button>
        }
      />

      <div className="card">
        <div className="flex flex-wrap gap-2 border-b border-black/[0.07] p-3">
          <Select value={statusFilter} onChange={(e) => updateStatusFilter(e.target.value as PurchaseOrderStatus | "all")} className="w-40">
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="submitted">Submitted</option>
            <option value="partial">Partial</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </Select>
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
        ) : orders.length === 0 ? (
          <EmptyState icon={<ClipboardList size={28} />} title="No purchase orders found" hint="Create one to restock from a supplier" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>PO number</Th>
                <Th>Supplier</Th>
                <Th>Status</Th>
                <Th>Order date</Th>
                <Th>Expected delivery</Th>
                <Th right>Total</Th>
                <Th right />
              </tr>
            </thead>
            <tbody>
              {orders.map((po) => (
                <tr key={po.uuid} className="cursor-pointer hover:bg-black/[0.015]" onClick={() => openView(po)}>
                  <Td className="font-mono text-xs">{po.po_number}</Td>
                  <Td>{po.supplier?.name ?? "—"}</Td>
                  <Td>
                    <Badge tone={statusTone[po.status]} className="capitalize">
                      {po.status}
                    </Badge>
                  </Td>
                  <Td className="text-ink-secondary">{formatDate(po.order_date)}</Td>
                  <Td className="text-ink-secondary">{po.expected_delivery_date ? formatDate(po.expected_delivery_date) : "—"}</Td>
                  <Td right className="font-medium">
                    {money(po.total_amount)}
                  </Td>
                  <Td right>
                    {po.status === "draft" && (
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setDeleting(po)}
                          aria-label={`Delete ${po.po_number}`}
                          className="rounded-md p-1.5 text-ink-muted hover:bg-black/[0.05] hover:text-status-critical cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {!error && !loading && orders.length > 0 && (
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
        <CreatePOModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            refetch();
          }}
        />
      )}

      {viewing && (
        <Modal open onClose={() => setViewing(null)} title={`Purchase order ${viewing.po_number}`} width="max-w-2xl">
          {actionError && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{actionError}</p>}
          <div className="mb-3 flex items-center justify-between">
            <div>
              <Badge tone={statusTone[viewing.status]} className="capitalize">
                {viewing.status}
              </Badge>
              <span className="ml-2 text-sm text-ink-secondary">{viewing.supplier?.name ?? "—"}</span>
            </div>
            <div className="flex gap-2">
              {viewing.status === "draft" && (
                <Button size="sm" disabled={actionBusy} onClick={() => handleSubmit(viewing)}>
                  <Send size={13} /> Submit
                </Button>
              )}
              {(viewing.status === "submitted" || viewing.status === "partial") && (
                <Button size="sm" disabled={actionBusy} onClick={() => openReceive(viewing)}>
                  <PackageCheck size={13} /> Receive items
                </Button>
              )}
              {(viewing.status === "draft" || viewing.status === "submitted") && (
                <Button size="sm" variant="danger" disabled={actionBusy} onClick={() => handleCancel(viewing)}>
                  <Ban size={13} /> Cancel
                </Button>
              )}
              {viewing.status === "received" && (
                <Badge tone="good">
                  <CheckCircle2 size={12} /> Received {viewing.received_date ? formatDate(viewing.received_date) : ""}
                </Badge>
              )}
            </div>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <p>
              <span className="text-ink-muted">Order date:</span> {formatDate(viewing.order_date)}
            </p>
            <p>
              <span className="text-ink-muted">Expected delivery:</span>{" "}
              {viewing.expected_delivery_date ? formatDate(viewing.expected_delivery_date) : "—"}
            </p>
            {viewing.user && (
              <p>
                <span className="text-ink-muted">Created by:</span> {viewing.user.name}
              </p>
            )}
            {viewing.branch && (
              <p>
                <span className="text-ink-muted">Branch:</span> {viewing.branch.name}
              </p>
            )}
            {viewing.notes && (
              <p className="col-span-2">
                <span className="text-ink-muted">Notes:</span> {viewing.notes}
              </p>
            )}
          </div>

          {viewingLoading ? (
            <div className="flex justify-center py-10">
              <Spinner size="md" />
            </div>
          ) : !viewing.items || viewing.items.length === 0 ? (
            <EmptyState icon={<ClipboardList size={24} />} title="Line items are not available for this order" />
          ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th right>Ordered</Th>
                <Th right>Received</Th>
                <Th right>Unit cost</Th>
                <Th right>Line total</Th>
              </tr>
            </thead>
            <tbody>
              {viewing.items.map((item) => (
                <tr key={item.id}>
                  <Td>
                    <p className="font-medium">{item.product.name}</p>
                    <p className="font-mono text-xs text-ink-muted">{item.product.sku}</p>
                  </Td>
                  <Td right>{formatQty(item.quantity_ordered)}</Td>
                  <Td right>
                    <span className={cx(toNum(item.quantity_received) < toNum(item.quantity_ordered) && "text-status-warning")}>
                      {formatQty(item.quantity_received)}
                    </span>
                  </Td>
                  <Td right>{money(item.unit_cost)}</Td>
                  <Td right className="font-medium">
                    {money(item.line_total)}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          )}
          <div className="mt-3 flex items-center justify-end gap-2 rounded-lg bg-black/[0.04] px-3 py-2">
            <span className="text-xs text-ink-secondary">Total amount</span>
            <span className="text-base font-semibold">{money(viewing.total_amount)}</span>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => {
          setDeleting(null);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
        title="Delete purchase order"
        message={
          deleteError
            ? deleteError
            : deleting
            ? `Delete draft "${deleting.po_number}"? This cannot be undone from here.`
            : ""
        }
      />

      {receiving && (
        <ReceivePOModal
          po={receiving}
          onClose={() => setReceiving(null)}
          onReceived={(updated) => {
            setReceiving(null);
            setViewing(updated);
            refetch();
          }}
        />
      )}

      <PromptDialog
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        onSubmit={confirmCancel}
        title="Cancel purchase order"
        message={cancelling ? `Cancel ${cancelling.po_number} (${money(cancelling.total_amount)})? The supplier will not be expecting this order.` : ""}
        label="Reason for cancelling"
        placeholder="e.g. Ordered in error, supplier out of stock…"
        confirmLabel="Cancel order"
        tone="danger"
        multiline
        busy={actionBusy}
        error={cancelError}
      />
    </div>
  );
}

function ReceivePOModal({
  po,
  onClose,
  onReceived,
}: {
  po: PurchaseOrder;
  onClose: () => void;
  onReceived: (updated: PurchaseOrder) => void;
}) {
  const items = po.items ?? [];
  const [quantities, setQuantities] = useState<Record<number, number>>(() =>
    Object.fromEntries(items.map((it) => [it.id, toNum(it.quantity_remaining)]))
  );
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateQuantity(id: number, value: number) {
    setQuantities((prev) => ({ ...prev, [id]: value }));
  }

  const linesToReceive = items
    .map((it) => ({ item: it, quantity: quantities[it.id] ?? 0 }))
    .filter(({ item, quantity }) => quantity > 0 && quantity <= toNum(item.quantity_remaining));

  const valid = linesToReceive.length > 0;

  async function submit() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await receivePurchaseOrder(po.uuid, {
        received_date: receivedDate,
        notes: notes.trim() || undefined,
        items: linesToReceive.map(({ item, quantity }) => ({
          purchase_order_item_id: item.id,
          quantity_received: quantity,
        })),
      });
      onReceived(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to receive purchase order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Receive items — ${po.po_number}`}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={!valid || saving} onClick={submit}>
            {saving ? "Receiving…" : "Confirm receipt"}
          </Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
      <Field label="Received date">
        <Input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className="w-44" />
      </Field>

      {items.length === 0 ? (
        <EmptyState icon={<ClipboardList size={24} />} title="Line items are not available for this order" />
      ) : (
      <div className="mt-3">
        <Table>
          <thead>
            <tr>
              <Th>Product</Th>
              <Th right>Ordered</Th>
              <Th right>Already received</Th>
              <Th right>Remaining</Th>
              <Th right>Receiving now</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <Td>
                  <p className="font-medium">{item.product.name}</p>
                  <p className="font-mono text-xs text-ink-muted">{item.product.sku}</p>
                </Td>
                <Td right>{formatQty(item.quantity_ordered)}</Td>
                <Td right>{formatQty(item.quantity_received)}</Td>
                <Td right>{formatQty(item.quantity_remaining)}</Td>
                <Td right>
                  <Input
                    type="number"
                    min={0}
                    max={toNum(item.quantity_remaining)}
                    disabled={toNum(item.quantity_remaining) === 0}
                    value={quantities[item.id] ?? 0}
                    onChange={(e) =>
                      updateQuantity(item.id, Math.max(0, Math.min(toNum(item.quantity_remaining), parseFloat(e.target.value) || 0)))
                    }
                    className="w-24 text-right"
                  />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      )}

      <div className="mt-3">
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes for this receipt" />
        </Field>
      </div>
    </Modal>
  );
}

function CreatePOModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftPOItem[]>([{ key: 0, product_id: "", quantity: 1, unit_price: 0 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSuppliers({ per_page: 100, is_active: true })
      .then((res) => setSuppliers(res.items))
      .catch(() => {});
    listProducts({ per_page: 200, is_active: true })
      .then((res) => setProducts(res.items))
      .catch(() => {});
  }, []);

  function addItem() {
    setItems((prev) => [...prev, { key: Date.now(), product_id: "", quantity: 1, unit_price: 0 }]);
  }
  function removeItem(key: number) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }
  function updateItem(key: number, patch: Partial<DraftPOItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  const validItems = items.filter((it) => it.product_id && it.quantity > 0 && it.unit_price >= 0);
  const total = validItems.reduce((sum, it) => sum + it.quantity * it.unit_price, 0);
  const valid = supplierId && validItems.length > 0;

  async function submit() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await createPurchaseOrder({
        supplier_id: supplierId,
        expected_delivery_date: expectedDate || undefined,
        notes: notes.trim() || undefined,
        // UI works in pesos; the API takes unit_cost in integer centavos
        items: validItems.map(({ product_id, quantity, unit_price }) => ({ product_id, quantity, unit_cost: Math.round(unit_price * 100) })),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create purchase order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Create purchase order"
      width="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={!valid || saving} onClick={submit}>
            {saving ? "Creating…" : "Create purchase order"}
          </Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Supplier">
          <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">Select supplier…</option>
            {suppliers.map((s) => (
              <option key={s.uuid} value={s.uuid}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Expected delivery date">
          <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
        </Field>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Items</h3>
        <Button size="sm" variant="secondary" onClick={addItem}>
          <Plus size={13} /> Add item
        </Button>
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.key} className="flex items-end gap-2 rounded-lg border border-black/[0.07] p-2">
            <Field label="Product" className="flex-1">
              <Select value={item.product_id} onChange={(e) => updateItem(item.key, { product_id: e.target.value })}>
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.uuid} value={p.uuid}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Qty" className="w-24">
              <Input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem(item.key, { quantity: parseFloat(e.target.value) || 0 })}
              />
            </Field>
            <Field label="Unit cost" className="w-28">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={item.unit_price}
                onChange={(e) => updateItem(item.key, { unit_price: parseFloat(e.target.value) || 0 })}
              />
            </Field>
            <button
              onClick={() => removeItem(item.key)}
              disabled={items.length === 1}
              className="mb-0.5 rounded-md p-2 text-ink-muted hover:bg-black/[0.05] hover:text-status-critical disabled:opacity-30 cursor-pointer"
              aria-label="Remove item"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes for this order" />
        </Field>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg bg-black/[0.04] px-3 py-2">
        <span className="text-xs text-ink-secondary">Order total</span>
        <span className="text-sm font-semibold">
          {new Intl.NumberFormat("en-US", { style: "currency", currency: "PHP", minimumFractionDigits: 2 }).format(total)}
        </span>
      </div>
    </Modal>
  );
}

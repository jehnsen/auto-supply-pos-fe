"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Download, History, Package, Pencil, Plus, Search, Trash2, Truck } from "lucide-react";
import {
  createSupplier,
  deleteSupplier,
  getSupplierPriceHistory,
  getSupplierProducts,
  listSuppliers,
  makeSupplierPayment,
  updateSupplier,
  type Supplier,
  type SupplierPriceHistoryRow,
  type SupplierProductDetail,
  type SupplierWritePayload,
} from "@/lib/api/suppliers";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { cx, downloadCSV, formatDate } from "@/lib/utils";
import {
  Badge,
  Button,
  ConfirmDialog,
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
  Th,
} from "@/components/ui";

const PER_PAGE = 15;

type StatusFilter = "active" | "inactive" | "all";

export default function SuppliersPage() {
  const currency = useAuthStore((s) => s.user?.store.currency) ?? "PHP";
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [lastPage, setLastPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Supplier | "new" | null>(null);
  const [viewing, setViewing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  function updateStatus(v: StatusFilter) {
    setStatus(v);
    setPage(1);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await listSuppliers({
          page,
          per_page: PER_PAGE,
          q: debouncedQuery || undefined,
          is_active: status === "all" ? undefined : status === "active",
        });
        if (cancelled) return;
        setSuppliers(res.items);
        setTotal(res.total);
        setLastPage(res.lastPage);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load suppliers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedQuery, status, refreshKey]);

  function refetch() {
    setRefreshKey((k) => k + 1);
  }

  const canPrev = page > 1;
  const canNext = lastPage !== null ? page < lastPage : suppliers.length === PER_PAGE;

  function exportCSV() {
    downloadCSV(
      "suppliers.csv",
      ["Name", "Contact", "Phone", "Email", "Terms (days)", "Outstanding", "Total purchases", "Status"],
      suppliers.map((s) => [
        s.name,
        s.contact_person ?? "",
        s.phone ?? "",
        s.email ?? "",
        s.payment_terms_days,
        s.total_outstanding,
        s.total_purchases,
        s.is_active ? "Active" : "Inactive",
      ])
    );
  }

  async function handleSave(payload: SupplierWritePayload) {
    setSaving(true);
    setSaveError(null);
    try {
      if (editing === "new") await createSupplier(payload);
      else if (editing) await updateSupplier(editing.uuid, payload);
      setEditing(null);
      refetch();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteError(null);
    try {
      await deleteSupplier(deleting.uuid);
      setDeleting(null);
      refetch();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete supplier");
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Suppliers"
        subtitle={total !== null ? `${total} supplier${total === 1 ? "" : "s"} match the current filters` : undefined}
        actions={
          <>
            <Button variant="secondary" onClick={exportCSV} disabled={suppliers.length === 0}>
              <Download size={15} /> Export page CSV
            </Button>
            <Button onClick={() => setEditing("new")}>
              <Plus size={15} /> Add supplier
            </Button>
          </>
        }
      />

      <div className="card">
        <div className="flex flex-wrap gap-2 border-b border-black/[0.07] p-3">
          <div className="relative w-full max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, contact, or phone…" className="pl-9" />
          </div>
          <Select value={status} onChange={(e) => updateStatus(e.target.value as StatusFilter)} className="w-32">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
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
        ) : suppliers.length === 0 ? (
          <EmptyState icon={<Truck size={28} />} title="No suppliers found" hint="Add your first supplier to start creating purchase orders" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Supplier</Th>
                <Th>Contact</Th>
                <Th right>Terms</Th>
                <Th right>Outstanding</Th>
                <Th right>Total purchases</Th>
                <Th right />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.uuid} className="cursor-pointer hover:bg-black/[0.015]" onClick={() => setViewing(s)}>
                  <Td>
                    <p className="font-medium">{s.name}</p>
                    {!s.is_active && (
                      <Badge tone="neutral" className="mt-0.5">
                        Inactive
                      </Badge>
                    )}
                  </Td>
                  <Td>
                    <p className="text-xs">{s.contact_person}</p>
                    <p className="text-xs text-ink-muted">{s.phone}</p>
                  </Td>
                  <Td right>{s.payment_terms_days}d</Td>
                  <Td right>
                    <span className={cx("font-medium", s.total_outstanding > 0 && "text-status-warning")}>{money(s.total_outstanding)}</span>
                  </Td>
                  <Td right className="font-medium">
                    {money(s.total_purchases)}
                  </Td>
                  <Td right>
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setEditing(s)}
                        aria-label={`Edit ${s.name}`}
                        className="rounded-md p-1.5 text-ink-muted hover:bg-black/[0.05] hover:text-ink cursor-pointer"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleting(s)}
                        aria-label={`Delete ${s.name}`}
                        className="rounded-md p-1.5 text-ink-muted hover:bg-black/[0.05] hover:text-status-critical cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {!error && !loading && suppliers.length > 0 && (
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

      {editing && (
        <SupplierForm
          supplier={editing === "new" ? null : editing}
          saving={saving}
          error={saveError}
          onClose={() => {
            setEditing(null);
            setSaveError(null);
          }}
          onSave={handleSave}
        />
      )}

      {viewing && <SupplierDetail supplier={viewing} money={money} onClose={() => setViewing(null)} onChanged={refetch} />}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => {
          setDeleting(null);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
        title="Delete supplier"
        message={
          deleteError
            ? deleteError
            : deleting
            ? `Delete "${deleting.name}"? This calls the backend delete endpoint and cannot be undone from here.`
            : ""
        }
      />
    </div>
  );
}

function SupplierForm({
  supplier,
  saving,
  error,
  onClose,
  onSave,
}: {
  supplier: Supplier | null;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (payload: SupplierWritePayload) => void;
}) {
  const [form, setForm] = useState({
    name: supplier?.name ?? "",
    contactPerson: supplier?.contact_person ?? "",
    email: supplier?.email ?? "",
    phone: supplier?.phone ?? "",
    alternatePhone: supplier?.alternate_phone ?? "",
    address: supplier?.address ?? "",
    city: supplier?.city ?? "",
    province: supplier?.province ?? "",
    paymentTermsDays: supplier?.payment_terms_days?.toString() ?? "30",
    isActive: supplier?.is_active ?? true,
    notes: supplier?.notes ?? "",
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    onSave({
      name: form.name.trim(),
      contact_person: form.contactPerson.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      alternate_phone: form.alternatePhone.trim() || null,
      address: form.address.trim() || null,
      city: form.city.trim() || null,
      province: form.province.trim() || null,
      payment_terms_days: parseInt(form.paymentTermsDays, 10) || 0,
      is_active: form.isActive,
      notes: form.notes.trim() || null,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={supplier ? `Edit ${supplier.name}` : "Add supplier"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={!form.name.trim() || saving} onClick={submit}>
            {saving ? "Saving…" : supplier ? "Save changes" : "Add supplier"}
          </Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Supplier name" className="col-span-2">
          <Input autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Contact person">
          <Input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} />
        </Field>
        <Field label="Payment terms (days)">
          <Input type="number" min={0} value={form.paymentTermsDays} onChange={(e) => set("paymentTermsDays", e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Alternate phone">
          <Input value={form.alternatePhone} onChange={(e) => set("alternatePhone", e.target.value)} />
        </Field>
        <Field label="Email" className="col-span-2">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Address" className="col-span-2">
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="City">
          <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="Province">
          <Input value={form.province} onChange={(e) => set("province", e.target.value)} />
        </Field>
      </div>
      {supplier && (
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="accent-brand" />
          Active
        </label>
      )}
    </Modal>
  );
}

function SupplierDetail({
  supplier,
  money,
  onClose,
  onChanged,
}: {
  supplier: Supplier;
  money: (n: number) => string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState<"products" | "history" | "payment">("products");
  const [products, setProducts] = useState<SupplierProductDetail[]>([]);
  const [history, setHistory] = useState<SupplierPriceHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [paying, setPaying] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentDone, setPaymentDone] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      const [productsResult, historyResult] = await Promise.allSettled([
        getSupplierProducts(supplier.uuid),
        getSupplierPriceHistory(supplier.uuid),
      ]);
      if (cancelled) return;
      if (productsResult.status === "fulfilled") setProducts(productsResult.value);
      if (historyResult.status === "fulfilled") setHistory(historyResult.value);
      setLoading(false);
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [supplier.uuid]);

  async function submitPayment() {
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) return;
    setPaying(true);
    setPaymentError(null);
    setPaymentDone(null);
    try {
      await makeSupplierPayment(supplier.uuid, {
        amount,
        payment_method: paymentMethod,
        reference_number: paymentRef.trim() || undefined,
      });
      setPaymentAmount("");
      setPaymentRef("");
      setPaymentDone(`Payment of ${money(amount)} recorded successfully.`);
      onChanged();
    } catch (err) {
      setPaymentError(err instanceof ApiError ? err.message : "Failed to record payment");
    } finally {
      setPaying(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={supplier.name} width="max-w-3xl">
      <div className="mb-4 grid grid-cols-4 gap-3">
        <MiniStat label="Outstanding" value={money(supplier.total_outstanding)} />
        <MiniStat label="Total purchases" value={money(supplier.total_purchases)} />
        <MiniStat label="Purchase orders" value={String(supplier.total_purchase_orders)} />
        <MiniStat label="Payment terms" value={`${supplier.payment_terms_days} days`} />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        {supplier.contact_person && (
          <p>
            <span className="text-ink-muted">Contact:</span> {supplier.contact_person}
          </p>
        )}
        {supplier.phone && (
          <p>
            <span className="text-ink-muted">Phone:</span> {supplier.phone}
          </p>
        )}
        {supplier.email && (
          <p>
            <span className="text-ink-muted">Email:</span> {supplier.email}
          </p>
        )}
        {supplier.payment_rating && (
          <p>
            <span className="text-ink-muted">Payment rating:</span>{" "}
            <Badge tone={supplier.payment_rating === "good" ? "good" : "warning"}>{supplier.payment_rating}</Badge>
          </p>
        )}
      </div>

      <div className="mb-3">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "products", label: "Products" },
            { value: "history", label: "Price history" },
            { value: "payment", label: "Make payment" },
          ]}
        />
      </div>

      {tab === "products" &&
        (loading ? (
          <div className="flex justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : products.length === 0 ? (
          <EmptyState icon={<Package size={24} />} title="No products linked to this supplier" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th right>Supplier price</Th>
                <Th right>Stock</Th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.uuid}>
                  <Td>
                    <p className="font-medium">{p.name}</p>
                    <p className="font-mono text-xs text-ink-muted">{p.sku}</p>
                  </Td>
                  <Td right>{money(p.cost_price)}</Td>
                  <Td right>
                    <span className={cx(p.low_stock && "font-semibold text-status-warning")}>{parseFloat(p.current_stock)}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ))}

      {tab === "history" &&
        (loading ? (
          <div className="flex justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : history.length === 0 ? (
          <EmptyState icon={<History size={24} />} title="No purchase price history yet" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>PO</Th>
                <Th right>Qty</Th>
                <Th right>Unit price</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={`${h.product_uuid}-${i}`}>
                  <Td>{h.product_name}</Td>
                  <Td className="font-mono text-xs">{h.po_number}</Td>
                  <Td right>{h.quantity_ordered}</Td>
                  <Td right>{money(h.unit_price)}</Td>
                  <Td className="text-ink-secondary">{formatDate(h.order_date)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ))}

      {tab === "payment" && (
        <div className="rounded-lg border border-black/[0.07] p-3">
          {paymentError && <p className="mb-2 text-xs font-medium text-status-critical">{paymentError}</p>}
          {paymentDone && <p className="mb-2 text-xs font-medium text-status-good">{paymentDone}</p>}
          <div className="grid grid-cols-3 gap-2">
            <Field label="Amount">
              <Input type="number" min={0} step={0.01} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" />
            </Field>
            <Field label="Method">
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank transfer</option>
                <option value="check">Check</option>
                <option value="gcash">GCash</option>
                <option value="maya">Maya</option>
              </Select>
            </Field>
            <Field label="Reference no.">
              <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Optional" />
            </Field>
          </div>
          <div className="mt-3 flex justify-end">
            <Button disabled={paying || !paymentAmount} onClick={submitPayment}>
              {paying ? "Recording…" : "Record payment"}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-black/[0.04] px-3 py-2.5">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

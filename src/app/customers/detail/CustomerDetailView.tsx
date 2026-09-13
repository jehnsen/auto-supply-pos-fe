"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, FileText, HandCoins, Pencil, UserRound, Wallet } from "lucide-react";
import {
  getCustomer,
  getCustomerTransactions,
  updateCustomer,
  type CreditTransaction,
  type Customer,
  type CustomerType,
  type CustomerWritePayload,
} from "@/lib/api/customers";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { useRecordId } from "@/lib/use-record-id";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { AdjustCreditLimitModal } from "@/components/AdjustCreditLimitModal";
import { CustomerVehicles } from "@/components/CustomerVehicles";
import { RecordPaymentModal } from "@/components/RecordPaymentModal";
import { cx, formatDate, formatMoney } from "@/lib/utils";
import { Badge, Button, EmptyState, Field, Input, Modal, PageHeader, Select, Spinner, Table, Td, Th } from "@/components/ui";

const typeLabels: Record<CustomerType, string> = {
  walk_in: "Walk-in",
  regular: "Regular",
  // Wire value stays `bulk_farmer` — it's a backend enum; only the label is ours to change.
  bulk_farmer: "Fleet / Commercial",
  government: "Government",
};

/** Backend may send customer types outside the documented enum; fall back to a humanized raw value. */
function typeLabel(type: string): string {
  if (type in typeLabels) return typeLabels[type as CustomerType];
  return type.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function transactionDate(t: CreditTransaction): string {
  return t.transaction_date || t.created_at;
}

function ratingTone(rating: string): "good" | "warning" | "critical" {
  if (rating === "excellent" || rating === "good") return "good";
  if (rating === "poor") return "critical";
  return "warning";
}

export default function CustomerDetailView() {
  // Addressed as ?id=<uuid>; see `useRecordId`.
  const uuid = useRecordId();
  const router = useRouter();
  const currency = useAuthStore((s) => s.user?.store.currency) ?? "PHP";
  const money = (n: number) => formatMoney(n, currency);
  const canEdit = useAuthStore((s) => hasPermission(s.user?.role, s.permissions, PERMISSIONS.CUSTOMERS_EDIT));
  const canManageCredit = useAuthStore((s) => hasPermission(s.user?.role, s.permissions, PERMISSIONS.CUSTOMERS_MANAGE_CREDIT));

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txLastPage, setTxLastPage] = useState<number | null>(null);
  const [txLoading, setTxLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [adjustingCredit, setAdjustingCredit] = useState(false);
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function refetch() {
    setRefreshKey((k) => k + 1);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const c = await getCustomer(uuid);
        if (!cancelled) setCustomer(c);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load customer");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [uuid, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setTxLoading(true);
      try {
        const res = await getCustomerTransactions(uuid, txPage);
        if (cancelled) return;
        setTransactions(res.items);
        setTxLastPage(res.lastPage);
      } catch {
        // best-effort
      } finally {
        if (!cancelled) setTxLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [uuid, txPage, refreshKey]);

  async function handleSave(payload: CustomerWritePayload) {
    setSaving(true);
    setSaveError(null);
    try {
      await updateCustomer(uuid, payload);
      setEditing(false);
      refetch();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Failed to save customer");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-14">
        <Spinner size="md" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center gap-2 p-14 text-center">
        <AlertTriangle size={28} className="text-status-critical" />
        <p className="text-sm font-medium text-status-critical">{error ?? "Customer not found"}</p>
        <Button variant="secondary" size="sm" onClick={() => router.push("/customers")}>
          Back to customers
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6">
      <button
        onClick={() => router.push("/customers")}
        className="mb-3 flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink cursor-pointer"
      >
        <ArrowLeft size={14} /> Back to customers
      </button>

      <PageHeader
        title={customer.name}
        subtitle={`${customer.code} · ${typeLabel(customer.type)}${customer.is_active ? "" : " · Inactive"}`}
        actions={
          <>
            <Button variant="secondary" onClick={() => router.push(`/customers/statement?id=${uuid}`)}>
              <FileText size={15} /> Statement
            </Button>
            {canManageCredit && customer.total_outstanding > 0 && (
              <Button variant="secondary" onClick={() => setRecordingPayment(true)}>
                <HandCoins size={15} /> Record payment
              </Button>
            )}
            {canManageCredit && (
              <Button variant="secondary" onClick={() => setAdjustingCredit(true)}>
                <Wallet size={15} /> Adjust credit limit
              </Button>
            )}
            {canEdit && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil size={15} /> Edit
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MiniStat label="Credit limit" value={money(customer.credit_limit)} />
        <MiniStat label="Outstanding" value={money(customer.total_outstanding)} warn={customer.total_outstanding > 0} />
        <MiniStat label="Available credit" value={money(customer.available_credit)} />
        <MiniStat label="Lifetime purchases" value={money(customer.total_purchases)} />
        {customer.sales_count != null && <MiniStat label="Sales count" value={String(customer.sales_count)} />}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-1">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">Details</h3>
          <div className="flex flex-col gap-2 text-sm">
            {customer.business_name && (
              <p>
                <span className="text-ink-muted">Business:</span> {customer.business_name}
              </p>
            )}
            {customer.phone && (
              <p>
                <span className="text-ink-muted">Phone:</span> {customer.phone}
              </p>
            )}
            {customer.email && (
              <p>
                <span className="text-ink-muted">Email:</span> {customer.email}
              </p>
            )}
            {customer.address && (
              <p>
                <span className="text-ink-muted">Address:</span> {customer.address}
              </p>
            )}
            <p>
              <span className="text-ink-muted">Credit terms:</span> {customer.credit_terms_days} days
            </p>
            {customer.payment_rating && (
              <p>
                <span className="text-ink-muted">Payment rating:</span>{" "}
                <Badge tone={ratingTone(customer.payment_rating)} className="capitalize">
                  {customer.payment_rating}
                </Badge>
              </p>
            )}
            {customer.last_purchase_date && (
              <p>
                <span className="text-ink-muted">Last purchase:</span> {formatDate(customer.last_purchase_date)}
              </p>
            )}
            <p>
              <span className="text-ink-muted">Customer since:</span> {formatDate(customer.created_at)}
            </p>
          </div>
        </div>

        <div className="lg:col-span-3">
          <CustomerVehicles customerUuid={uuid} customerName={customer.name} />
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-black/[0.07] p-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Transaction history</h3>
          </div>
          {txLoading ? (
            <div className="flex justify-center py-14">
              <Spinner size="md" />
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState icon={<UserRound size={28} />} title="No credit transactions yet" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Reference</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th right>Amount</Th>
                  <Th right>Balance after</Th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.uuid}>
                    <Td className="text-ink-secondary">{formatDate(transactionDate(t))}</Td>
                    <Td>
                      <span className="font-mono text-xs">{t.reference_number ?? "—"}</span>
                      {t.notes && <p className="text-xs text-ink-muted">{t.notes}</p>}
                    </Td>
                    <Td className="capitalize">{t.type}</Td>
                    <Td>
                      {t.status === "outstanding" || t.status === "overdue" ? (
                        <Badge tone={t.status === "overdue" ? "critical" : "warning"} className="capitalize">
                          {t.status}
                          {t.status === "overdue" && t.days_overdue ? ` · ${t.days_overdue}d` : ""}
                        </Badge>
                      ) : (
                        <span className="text-xs capitalize text-ink-muted">{t.status}</span>
                      )}
                    </Td>
                    <Td right className={cx("whitespace-nowrap font-medium", t.type === "charge" && "text-status-warning")}>
                      {t.type === "payment" ? "-" : ""}
                      {money(Math.abs(t.amount))}
                    </Td>
                    <Td right className="text-ink-secondary">
                      {money(t.balance_after)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          {!txLoading && transactions.length > 0 && (
            <div className="flex items-center justify-between border-t border-black/[0.07] px-3 py-2.5 text-xs text-ink-secondary">
              <span>
                Page {txPage}
                {txLastPage ? ` of ${txLastPage}` : ""}
              </span>
              <div className="flex gap-1.5">
                <Button size="sm" variant="secondary" disabled={txPage <= 1} onClick={() => setTxPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={txLastPage !== null ? txPage >= txLastPage : transactions.length === 0}
                  onClick={() => setTxPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {editing && (
        <CustomerEditForm
          customer={customer}
          saving={saving}
          error={saveError}
          onClose={() => {
            setEditing(false);
            setSaveError(null);
          }}
          onSave={handleSave}
        />
      )}

      {adjustingCredit && (
        <AdjustCreditLimitModal
          customer={customer}
          money={money}
          onClose={() => setAdjustingCredit(false)}
          onSaved={() => {
            setAdjustingCredit(false);
            refetch();
          }}
        />
      )}

      {recordingPayment && (
        <RecordPaymentModal
          customer={customer}
          money={money}
          onClose={() => setRecordingPayment(false)}
          onSaved={() => {
            setRecordingPayment(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function MiniStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-black/[0.04] px-3 py-2.5">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className={cx("text-lg font-semibold", warn && "text-status-warning")}>{value}</p>
    </div>
  );
}

function CustomerEditForm({
  customer,
  saving,
  error,
  onClose,
  onSave,
}: {
  customer: Customer;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (payload: CustomerWritePayload) => void;
}) {
  const [form, setForm] = useState({
    name: customer.name,
    type: customer.type,
    phone: customer.phone ?? "",
    email: customer.email ?? "",
    address: customer.address ?? "",
    businessName: customer.business_name ?? "",
    creditTermsDays: customer.credit_terms_days?.toString() ?? "30",
    isActive: customer.is_active,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  function submit() {
    onSave({
      name: form.name.trim(),
      type: form.type,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      business_name: form.businessName.trim() || null,
      credit_terms_days: parseInt(form.creditTermsDays, 10) || 0,
      is_active: form.isActive,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Edit ${customer.name}`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={!form.name.trim() || saving} onClick={submit}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full name" className="col-span-2">
          <Input autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Type">
          <Select value={form.type} onChange={(e) => set("type", e.target.value as CustomerType)}>
            {Object.entries(typeLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Business name">
          <Input value={form.businessName} onChange={(e) => set("businessName", e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="Address" className="col-span-2">
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Credit terms (days)">
          <Input type="number" min={0} value={form.creditTermsDays} onChange={(e) => set("creditTermsDays", e.target.value)} />
        </Field>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="accent-brand" />
        Active
      </label>
    </Modal>
  );
}

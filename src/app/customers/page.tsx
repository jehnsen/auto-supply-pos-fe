"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Download, Pencil, Plus, Search, Trash2, Users, Wallet } from "lucide-react";
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
  type Customer,
  type CustomerType,
  type CustomerWritePayload,
} from "@/lib/api/customers";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { AdjustCreditLimitModal } from "@/components/AdjustCreditLimitModal";
import { cx, downloadCSV, formatDate } from "@/lib/utils";
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Table,
  Td,
  Th,
} from "@/components/ui";

const PER_PAGE = 15;

type StatusFilter = "active" | "inactive" | "all";
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

export default function CustomersPage() {
  const router = useRouter();
  const currency = useAuthStore((s) => s.user?.store.currency) ?? "PHP";
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);
  const canCreate = useAuthStore((s) => hasPermission(s.user?.role, s.permissions, PERMISSIONS.CUSTOMERS_CREATE));
  const canEdit = useAuthStore((s) => hasPermission(s.user?.role, s.permissions, PERMISSIONS.CUSTOMERS_EDIT));
  const canDelete = useAuthStore((s) => hasPermission(s.user?.role, s.permissions, PERMISSIONS.CUSTOMERS_DELETE));
  const canManageCredit = useAuthStore((s) => hasPermission(s.user?.role, s.permissions, PERMISSIONS.CUSTOMERS_MANAGE_CREDIT));

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [typeFilter, setTypeFilter] = useState<CustomerType | "all">("all");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [lastPage, setLastPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Customer | "new" | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [adjustingCredit, setAdjustingCredit] = useState<Customer | null>(null);
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
  function updateTypeFilter(v: CustomerType | "all") {
    setTypeFilter(v);
    setPage(1);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await listCustomers({
          page,
          per_page: PER_PAGE,
          q: debouncedQuery || undefined,
          type: typeFilter === "all" ? undefined : typeFilter,
          is_active: status === "all" ? undefined : status === "active",
        });
        if (cancelled) return;
        setCustomers(res.items);
        setTotal(res.total);
        setLastPage(res.lastPage);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load customers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedQuery, status, typeFilter, refreshKey]);

  function refetch() {
    setRefreshKey((k) => k + 1);
  }

  const canPrev = page > 1;
  const canNext = lastPage !== null ? page < lastPage : customers.length === PER_PAGE;

  function exportCSV() {
    downloadCSV(
      "customers.csv",
      ["Code", "Name", "Type", "Phone", "Email", "Credit limit", "Outstanding", "Total purchases", "Last purchase"],
      customers.map((c) => [
        c.code,
        c.name,
        typeLabel(c.type),
        c.phone ?? "",
        c.email ?? "",
        c.credit_limit,
        c.total_outstanding,
        c.total_purchases,
        c.last_purchase_date ? formatDate(c.last_purchase_date) : "",
      ])
    );
  }

  async function handleSave(payload: CustomerWritePayload) {
    setSaving(true);
    setSaveError(null);
    try {
      if (editing === "new") await createCustomer(payload);
      else if (editing) await updateCustomer(editing.uuid, payload);
      setEditing(null);
      refetch();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Failed to save customer");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteError(null);
    try {
      await deleteCustomer(deleting.uuid);
      setDeleting(null);
      refetch();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete customer");
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Customers"
        subtitle={total !== null ? `${total} customer${total === 1 ? "" : "s"} match the current filters` : undefined}
        actions={
          <>
            <Button variant="secondary" onClick={exportCSV} disabled={customers.length === 0}>
              <Download size={15} /> Export page CSV
            </Button>
            {canCreate && (
              <Button onClick={() => setEditing("new")}>
                <Plus size={15} /> Add customer
              </Button>
            )}
          </>
        }
      />

      <div className="card">
        <div className="flex flex-wrap gap-2 border-b border-black/[0.07] p-3">
          <div className="relative w-full max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, or email…" className="pl-9" />
          </div>
          <Select value={typeFilter} onChange={(e) => updateTypeFilter(e.target.value as CustomerType | "all")} className="w-40">
            <option value="all">All types</option>
            {Object.entries(typeLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
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
        ) : customers.length === 0 ? (
          <EmptyState icon={<Users size={28} />} title="No customers found" hint="Add your first customer to start tracking credit" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Customer</Th>
                <Th>Contact</Th>
                <Th right>Credit limit</Th>
                <Th right>Outstanding</Th>
                <Th right>Total purchases</Th>
                <Th>Last purchase</Th>
                <Th right />
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.uuid} className="cursor-pointer hover:bg-black/[0.015]" onClick={() => router.push(`/customers/${c.uuid}`)}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-strong">
                        {c.name
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")}
                      </div>
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-ink-muted">
                          {c.code} · {typeLabel(c.type)}
                        </p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <p className="text-xs">{c.phone}</p>
                    <p className="text-xs text-ink-muted">{c.email}</p>
                  </Td>
                  <Td right>{money(c.credit_limit)}</Td>
                  <Td right>
                    <span className={cx("font-medium", c.total_outstanding > 0 && "text-status-warning")}>{money(c.total_outstanding)}</span>
                  </Td>
                  <Td right className="font-medium">
                    {money(c.total_purchases)}
                  </Td>
                  <Td className="text-ink-secondary">{c.last_purchase_date ? formatDate(c.last_purchase_date) : "—"}</Td>
                  <Td right>
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      {canEdit && (
                        <button
                          onClick={() => setEditing(c)}
                          aria-label={`Edit ${c.name}`}
                          className="rounded-md p-1.5 text-ink-muted hover:bg-black/[0.05] hover:text-ink cursor-pointer"
                        >
                          <Pencil size={14} />
                        </button>
                      )}
                      {canManageCredit && (
                        <button
                          onClick={() => setAdjustingCredit(c)}
                          aria-label={`Adjust credit limit for ${c.name}`}
                          title="Adjust credit limit"
                          className="rounded-md p-1.5 text-ink-muted hover:bg-black/[0.05] hover:text-ink cursor-pointer"
                        >
                          <Wallet size={14} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleting(c)}
                          aria-label={`Delete ${c.name}`}
                          className="rounded-md p-1.5 text-ink-muted hover:bg-black/[0.05] hover:text-status-critical cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {!error && !loading && customers.length > 0 && (
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
        <CustomerForm
          customer={editing === "new" ? null : editing}
          saving={saving}
          error={saveError}
          canManageCredit={canManageCredit}
          onClose={() => {
            setEditing(null);
            setSaveError(null);
          }}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => {
          setDeleting(null);
          setDeleteError(null);
        }}
        onConfirm={handleDelete}
        title="Delete customer"
        message={
          deleteError
            ? deleteError
            : deleting
            ? `Delete "${deleting.name}"? This calls the backend delete endpoint and cannot be undone from here.`
            : ""
        }
      />

      {adjustingCredit && (
        <AdjustCreditLimitModal
          customer={adjustingCredit}
          money={money}
          onClose={() => setAdjustingCredit(null)}
          onSaved={() => {
            setAdjustingCredit(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function CustomerForm({
  customer,
  saving,
  error,
  canManageCredit,
  onClose,
  onSave,
}: {
  customer: Customer | null;
  saving: boolean;
  error: string | null;
  canManageCredit: boolean;
  onClose: () => void;
  onSave: (payload: CustomerWritePayload) => void;
}) {
  const [form, setForm] = useState({
    name: customer?.name ?? "",
    type: customer?.type ?? ("regular" as CustomerType),
    phone: customer?.phone ?? "",
    email: customer?.email ?? "",
    address: customer?.address ?? "",
    businessName: customer?.business_name ?? "",
    creditLimit: customer?.credit_limit?.toString() ?? "0",
    creditTermsDays: customer?.credit_terms_days?.toString() ?? "30",
    isActive: customer?.is_active ?? true,
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
      // Existing customers change their limit via the dedicated "Adjust credit limit" dialog, which records a reason.
      credit_limit: customer ? undefined : canManageCredit ? parseFloat(form.creditLimit) || 0 : 0,
      credit_terms_days: canManageCredit ? parseInt(form.creditTermsDays, 10) || 0 : customer?.credit_terms_days ?? 0,
      is_active: form.isActive,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={customer ? `Edit ${customer.name}` : "Add customer"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={!form.name.trim() || saving} onClick={submit}>
            {saving ? "Saving…" : customer ? "Save changes" : "Add customer"}
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
        {!customer && (
          <Field label="Credit limit">
            <Input
              type="number"
              min={0}
              step={0.01}
              value={form.creditLimit}
              onChange={(e) => set("creditLimit", e.target.value)}
              disabled={!canManageCredit}
            />
          </Field>
        )}
        <Field label="Credit terms (days)">
          <Input
            type="number"
            min={0}
            value={form.creditTermsDays}
            onChange={(e) => set("creditTermsDays", e.target.value)}
            disabled={!canManageCredit}
          />
        </Field>
      </div>
      {customer && (
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="accent-brand" />
          Active
        </label>
      )}
    </Modal>
  );
}


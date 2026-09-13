"use client";

import { useEffect, useState } from "react";
import { Building2, Users as UsersIcon, KeyRound, Pencil, Plus, Receipt, ShieldCheck, Store, Trash2, Wallet } from "lucide-react";
import {
  activateUser,
  createBranch,
  createUser,
  deactivateUser,
  deleteBranch,
  deleteUser,
  getPaymentMethods,
  getReceiptTemplate,
  getStoreProfile,
  getTaxSettings,
  listBranches,
  listUsers,
  resetUserPassword,
  updateBranch,
  updatePaymentMethods,
  updateReceiptTemplate,
  updateStoreProfile,
  updateTaxSettings,
  updateUser,
  type Branch,
  type PaymentMethodsSettings,
  type StoreUser,
} from "@/lib/api/settings";
import { getPermissionCatalog, getRolePermissions, updateRolePermissions, type PermissionCatalog } from "@/lib/api/permissions";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { Badge, Button, ConfirmDialog, Field, Input, Modal, PageHeader, Segmented, Select, Spinner, Table, Td, Textarea, Th } from "@/components/ui";
import { cx } from "@/lib/utils";

type Section = "store" | "tax" | "receipt" | "payments" | "users" | "branches" | "permissions";

export default function SettingsPage() {
  const [section, setSection] = useState<Section>("store");
  const isOwner = useAuthStore((s) => s.user?.role === "owner");

  return (
    <div className="mx-auto max-w-3xl p-6">
      <PageHeader title="Settings" subtitle="Store profile, taxes, receipts, payments, users, and branches" />

      <div className="mb-5">
        <Segmented<Section>
          value={section}
          onChange={setSection}
          options={[
            { value: "store", label: "Store" },
            { value: "tax", label: "Tax" },
            { value: "receipt", label: "Receipt" },
            { value: "payments", label: "Payments" },
            { value: "users", label: "Users" },
            { value: "branches", label: "Branches" },
            ...(isOwner ? [{ value: "permissions" as const, label: "Permissions" }] : []),
          ]}
        />
      </div>

      {section === "store" && <StoreSection />}
      {section === "tax" && <TaxSection />}
      {section === "receipt" && <ReceiptSection />}
      {section === "payments" && <PaymentsSection />}
      {section === "users" && <UsersSection />}
      {section === "branches" && <BranchesSection />}
      {section === "permissions" && isOwner && <PermissionsSection />}
    </div>
  );
}

function SavedBadge({ saved }: { saved: boolean }) {
  return saved ? <span className="text-xs font-medium text-status-good">Saved ✓</span> : null;
}

/* ---------- Store profile ---------- */

function StoreSection() {
  const [form, setForm] = useState({ storeName: "", address: "", phone: "", email: "", tin: "", businessHours: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStoreProfile()
      .then((p) =>
        setForm({
          storeName: p.store.name,
          address: p.store.address,
          phone: p.store.phone,
          email: p.store.email,
          tin: p.store.tin ?? "",
          businessHours: "",
        })
      )
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load store profile"))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateStoreProfile({
        name: form.storeName,
        address: form.address,
        phone: form.phone,
        email: form.email,
        tin: form.tin,
        business_hours: form.businessHours,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save store profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Store size={16} /> Store profile
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Store name" className="col-span-2">
          <Input value={form.storeName} onChange={(e) => set("storeName", e.target.value)} />
        </Field>
        <Field label="Address" className="col-span-2">
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <Field label="TIN">
          <Input value={form.tin} onChange={(e) => set("tin", e.target.value)} />
        </Field>
        <Field label="Business hours">
          <Input value={form.businessHours} onChange={(e) => set("businessHours", e.target.value)} placeholder="e.g. Mon-Sat 8AM-6PM" />
        </Field>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-black/[0.07] pt-4">
        <SavedBadge saved={saved} />
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

/* ---------- Tax ---------- */

function TaxSection() {
  const [vatRate, setVatRate] = useState("12");
  const [vatInclusive, setVatInclusive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTaxSettings()
      .then((t) => {
        setVatRate(t.vat_rate.toString());
        setVatInclusive(t.vat_inclusive);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load tax settings"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateTaxSettings({ vat_rate: parseFloat(vatRate) || 0, is_vat_inclusive: vatInclusive });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save tax settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Wallet size={16} /> Tax
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="VAT rate %">
          <Input type="number" min={0} step={0.1} value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
        </Field>
        <Field label="VAT type">
          <Select value={vatInclusive ? "inclusive" : "exclusive"} onChange={(e) => setVatInclusive(e.target.value === "inclusive")}>
            <option value="inclusive">VAT inclusive</option>
            <option value="exclusive">VAT exclusive</option>
          </Select>
        </Field>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-black/[0.07] pt-4">
        <SavedBadge saved={saved} />
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

/* ---------- Receipt template ---------- */

function ReceiptSection() {
  const [form, setForm] = useState({ headerText: "", footerText: "", showLogo: true, showTin: true, showAddress: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getReceiptTemplate()
      .then((t) => setForm((f) => ({ ...f, headerText: t.header_text, footerText: t.footer_text, showLogo: t.show_logo })))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load receipt template"))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateReceiptTemplate({
        header_text: form.headerText,
        footer_text: form.footerText,
        show_logo: form.showLogo,
        show_tin: form.showTin,
        show_address: form.showAddress,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save receipt template");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Receipt size={16} /> Receipt template
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
      <Field label="Header text">
        <Input value={form.headerText} onChange={(e) => setForm((f) => ({ ...f, headerText: e.target.value }))} />
      </Field>
      <Field label="Footer text">
        <Textarea value={form.footerText} onChange={(e) => setForm((f) => ({ ...f, footerText: e.target.value }))} className="min-h-16" />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.showLogo} onChange={(e) => setForm((f) => ({ ...f, showLogo: e.target.checked }))} className="accent-brand" />
          Show logo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.showTin} onChange={(e) => setForm((f) => ({ ...f, showTin: e.target.checked }))} className="accent-brand" />
          Show TIN
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.showAddress} onChange={(e) => setForm((f) => ({ ...f, showAddress: e.target.checked }))} className="accent-brand" />
          Show address
        </label>
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-black/[0.07] pt-4">
        <SavedBadge saved={saved} />
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

/* ---------- Payment methods ---------- */

function PaymentsSection() {
  const [methods, setMethods] = useState<PaymentMethodsSettings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPaymentMethods()
      .then(setMethods)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load payment methods"))
      .finally(() => setLoading(false));
  }, []);

  function toggle(code: string) {
    setMethods((m) => ({ ...m, [code]: { ...m[code], enabled: !m[code].enabled } }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updatePaymentMethods(Object.entries(methods).map(([code, cfg]) => ({ code, name: cfg.name, is_active: cfg.enabled })));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save payment methods");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Wallet size={16} /> Payment methods
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
      <div className="flex flex-col gap-2">
        {Object.entries(methods).map(([code, cfg]) => (
          <label key={code} className="flex items-center justify-between rounded-lg border border-black/[0.07] px-3 py-2.5 text-sm">
            <span className="font-medium">{cfg.name}</span>
            <input type="checkbox" checked={cfg.enabled} onChange={() => toggle(code)} className="accent-brand" />
          </label>
        ))}
      </div>
      <div className="flex items-center justify-end gap-3 border-t border-black/[0.07] pt-4">
        <SavedBadge saved={saved} />
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

/* ---------- Users ---------- */

function UsersSection() {
  const [users, setUsers] = useState<StoreUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<StoreUser | "new" | null>(null);
  const [deleting, setDeleting] = useState<StoreUser | null>(null);
  const [resetting, setResetting] = useState<StoreUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const [u, b] = await Promise.all([listUsers(1), listBranches().catch(() => [])]);
        if (cancelled) return;
        setUsers(u.items);
        setBranches(b);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load users");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function refetch() {
    setRefreshKey((k) => k + 1);
  }

  async function toggleActive(u: StoreUser) {
    try {
      if (u.is_active) await deactivateUser(u.uuid);
      else await activateUser(u.uuid);
      refetch();
    } catch {
      // best-effort
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-black/[0.07] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <UsersIcon size={16} /> Users
        </div>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus size={14} /> Add user
        </Button>
      </div>
      {error ? (
        <p className="p-4 text-sm font-medium text-status-critical">{error}</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>User</Th>
              <Th>Role</Th>
              <Th>Branch</Th>
              <Th>Status</Th>
              <Th right>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.uuid} className="hover:bg-black/[0.015]">
                <Td>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-xs text-ink-muted">{u.email}</p>
                </Td>
                <Td className="capitalize">{u.role_display || u.role}</Td>
                <Td>{u.branch?.name ?? "—"}</Td>
                <Td>
                  <Badge tone={u.is_active ? "good" : "neutral"}>{u.is_active ? "Active" : "Inactive"}</Badge>
                </Td>
                <Td right>
                  <div className="flex justify-end gap-1">
                    <button onClick={() => setEditing(u)} aria-label={`Edit ${u.name}`} className="rounded-md p-1.5 text-ink-muted hover:bg-black/[0.05] hover:text-ink cursor-pointer">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setResetting(u)} aria-label={`Reset password for ${u.name}`} className="rounded-md p-1.5 text-ink-muted hover:bg-black/[0.05] hover:text-ink cursor-pointer">
                      <KeyRound size={14} />
                    </button>
                    <button onClick={() => toggleActive(u)} className="rounded-md px-2 py-1 text-xs text-ink-muted hover:bg-black/[0.05] hover:text-ink cursor-pointer">
                      {u.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button onClick={() => setDeleting(u)} aria-label={`Delete ${u.name}`} className="rounded-md p-1.5 text-ink-muted hover:bg-black/[0.05] hover:text-status-critical cursor-pointer">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {editing && (
        <UserForm
          user={editing === "new" ? null : editing}
          branches={branches}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteUser(deleting.uuid).then(() => { setDeleting(null); refetch(); })}
        title="Delete user"
        message={deleting ? `Delete ${deleting.name}? This cannot be undone.` : ""}
      />

      {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />}
    </div>
  );
}

function UserForm({
  user,
  branches,
  onClose,
  onSaved,
}: {
  user: StoreUser | null;
  branches: Branch[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: user?.name ?? "",
    email: user?.email ?? "",
    password: "",
    role: user?.role ?? "cashier",
    branchId: user?.branch ? String(user.branch.id) : "",
    phone: user?.phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      if (user) {
        await updateUser(user.uuid, { name: form.name, email: form.email, role: form.role, branch_id: form.branchId ? Number(form.branchId) : undefined, phone: form.phone });
      } else {
        await createUser({ name: form.name, email: form.email, password: form.password, role: form.role, branch_id: form.branchId ? Number(form.branchId) : undefined, phone: form.phone });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={user ? `Edit ${user.name}` : "Add user"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={!form.name.trim() || !form.email.trim() || (!user && !form.password) || saving} onClick={submit}>
            {saving ? "Saving…" : user ? "Save changes" : "Add user"}
          </Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full name" className="col-span-2">
          <Input autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        {!user && (
          <Field label="Password">
            <Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} />
          </Field>
        )}
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Role">
          <Select value={form.role} onChange={(e) => set("role", e.target.value)}>
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="cashier">Cashier</option>
          </Select>
        </Field>
        <Field label="Branch" className="col-span-2">
          <Select value={form.branchId} onChange={(e) => set("branchId", e.target.value)}>
            <option value="">Unassigned</option>
            {branches.map((b) => (
              <option key={b.uuid} value={String(b.id)}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ user, onClose }: { user: StoreUser; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await resetUserPassword(user.uuid, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reset password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Reset password · ${user.name}`}
      width="max-w-sm"
      footer={
        done ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <Button disabled={password.length < 8 || saving} onClick={submit}>
            {saving ? "Saving…" : "Reset password"}
          </Button>
        )
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
      {done ? (
        <p className="text-sm text-status-good">Password reset successfully.</p>
      ) : (
        <Field label="New password (min 8 characters)">
          <Input type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
      )}
    </Modal>
  );
}

/* ---------- Branches ---------- */

function BranchesSection() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editing, setEditing] = useState<Branch | "new" | null>(null);
  const [deleting, setDeleting] = useState<Branch | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const b = await listBranches();
        if (!cancelled) setBranches(b);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load branches");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  function refetch() {
    setRefreshKey((k) => k + 1);
  }

  if (loading) return <LoadingCard />;

  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-black/[0.07] px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Building2 size={16} /> Branches
        </div>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus size={14} /> Add branch
        </Button>
      </div>
      {error ? (
        <p className="p-4 text-sm font-medium text-status-critical">{error}</p>
      ) : (
        <div className="flex flex-col gap-2 p-4">
          {branches.map((b) => (
            <div key={b.uuid} className="flex items-center justify-between rounded-lg border border-black/[0.07] px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">
                  {b.name} {b.is_main && <Badge tone="brand" className="ml-1.5">Main</Badge>}
                </p>
                <p className="text-xs text-ink-muted">{b.address}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={b.is_active ? "good" : "neutral"}>{b.is_active ? "Active" : "Inactive"}</Badge>
                <button onClick={() => setEditing(b)} aria-label={`Edit ${b.name}`} className="rounded-md p-1.5 text-ink-muted hover:bg-black/[0.05] hover:text-ink cursor-pointer">
                  <Pencil size={14} />
                </button>
                {!b.is_main && (
                  <button onClick={() => setDeleting(b)} aria-label={`Delete ${b.name}`} className="rounded-md p-1.5 text-ink-muted hover:bg-black/[0.05] hover:text-status-critical cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <BranchForm
          branch={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refetch();
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteBranch(deleting.uuid).then(() => { setDeleting(null); refetch(); })}
        title="Delete branch"
        message={deleting ? `Delete ${deleting.name}?` : ""}
      />
    </div>
  );
}

function BranchForm({ branch, onClose, onSaved }: { branch: Branch | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: branch?.name ?? "",
    address: branch?.address ?? "",
    phone: branch?.phone ?? "",
    isActive: branch?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const payload = { name: form.name.trim(), address: form.address.trim(), phone: form.phone.trim(), is_active: form.isActive };
      if (branch) await updateBranch(branch.uuid, payload);
      else await createBranch(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save branch");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={branch ? `Edit ${branch.name}` : "Add branch"}
      width="max-w-sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={!form.name.trim() || saving} onClick={submit}>
            {saving ? "Saving…" : branch ? "Save changes" : "Add branch"}
          </Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
      <div className="flex flex-col gap-3">
        <Field label="Name">
          <Input autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </Field>
        <Field label="Address">
          <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
        </Field>
        {branch && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} className="accent-brand" />
            Active
          </label>
        )}
      </div>
    </Modal>
  );
}

/* ---------- Permissions (owner-only: role default access levels) ---------- */

const EDITABLE_ROLES = [
  { value: "manager", label: "Manager" },
  { value: "cashier", label: "Cashier" },
] as const;

function PermissionsSection() {
  const [role, setRole] = useState<(typeof EDITABLE_ROLES)[number]["value"]>("cashier");
  const [catalog, setCatalog] = useState<PermissionCatalog | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPermissionCatalog()
      .then(setCatalog)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load permission catalog"));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await getRolePermissions(role);
        if (!cancelled) setSelected(new Set(res.permissions));
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load role permissions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [role]);

  function toggle(key: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await updateRolePermissions(role, Array.from(selected));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save role permissions");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck size={16} /> Role permissions
        </div>
        <Select value={role} onChange={(e) => setRole(e.target.value as typeof role)} className="w-36">
          {EDITABLE_ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </Select>
      </div>
      <p className="text-xs text-ink-muted">
        Owner is an unrestricted super-admin and isn&apos;t listed here. These defaults apply to every user with the selected role.
      </p>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
      {loading || !catalog ? (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(catalog).map(([category, perms]) => (
            <div key={category} className="rounded-lg border border-black/[0.07] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{category}</p>
              <div className="flex flex-col gap-1.5">
                {Object.entries(perms).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selected.has(key)}
                      onChange={() => toggle(key)}
                      className="accent-brand"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-end gap-3 border-t border-black/[0.07] pt-4">
        <SavedBadge saved={saved} />
        <Button onClick={save} disabled={saving || loading}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className={cx("card flex justify-center p-8")}>
      <Spinner size="md" />
    </div>
  );
}

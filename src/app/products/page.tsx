"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Download, Package, Pencil, Plus, Search, Tags, Trash2 } from "lucide-react";
import {
  createProduct,
  deleteProduct,
  getProductByUuid,
  listProducts,
  updateProduct,
  type ProductCondition,
  type ProductDetail,
  type ProductListItem,
  type ProductWritePayload,
} from "@/lib/api/products";
import { createCategory, deleteCategory, listCategories, updateCategory, type Category } from "@/lib/api/categories";
import { listUnits, type Unit } from "@/lib/api/units";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { cx, downloadCSV, formatMoney } from "@/lib/utils";
import {
  Badge,
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
  Textarea,
  Th,
} from "@/components/ui";

const PER_PAGE = 15;

type StatusFilter = "active" | "archived" | "all";
type SortBy = "name" | "sku" | "retail_price" | "current_stock" | "created_at";

export default function ProductsPage() {
  const currency = useAuthStore((s) => s.user?.store.currency) ?? "PHP";
  const canCreate = useAuthStore((s) => hasPermission(s.user?.role, s.permissions, PERMISSIONS.PRODUCTS_CREATE));
  const canEdit = useAuthStore((s) => hasPermission(s.user?.role, s.permissions, PERMISSIONS.PRODUCTS_EDIT));
  const canDelete = useAuthStore((s) => hasPermission(s.user?.role, s.permissions, PERMISSIONS.PRODUCTS_DELETE));
  const canManageRow = canEdit || canDelete;
  const money = (n: number) =>
    formatMoney(n, currency);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  /** Category uuid, or "all". The edit form's `categoryId` is a numeric id — they aren't interchangeable. */
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [lastPage, setLastPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [catModal, setCatModal] = useState(false);

  const [editing, setEditing] = useState<ProductDetail | "new" | null>(null);
  const [editingLoading, setEditingLoading] = useState(false);
  const [deleting, setDeleting] = useState<ProductListItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    listCategories({ per_page: 100 })
      .then((res) => setCategories(res.items))
      .catch(() => {});
    listUnits()
      .then(setUnits)
      .catch(() => {});
  }, []);

  function refetchCategories() {
    listCategories({ per_page: 100 })
      .then((res) => setCategories(res.items))
      .catch(() => {});
  }

  async function openEdit(product: ProductListItem) {
    setEditingLoading(true);
    try {
      const detail = await getProductByUuid(product.uuid);
      setEditing(detail);
    } catch {
      setEditing({ ...product, category: null, unit: null });
    } finally {
      setEditingLoading(false);
    }
  }

  // Debounce search input
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
  function updateCategoryFilter(v: string) {
    setCategoryFilter(v);
    setPage(1);
  }
  function updateLowStockOnly(v: boolean) {
    setLowStockOnly(v);
    setPage(1);
  }
  function updateSortBy(v: SortBy) {
    setSortBy(v);
    setPage(1);
  }
  function updateSortOrder(v: "asc" | "desc") {
    setSortOrder(v);
    setPage(1);
  }

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await listProducts({
          page,
          per_page: PER_PAGE,
          q: debouncedQuery || undefined,
          categoryUuid: categoryFilter === "all" ? undefined : categoryFilter,
          is_active: status === "all" ? undefined : status === "active",
          low_stock: lowStockOnly || undefined,
          sort_by: sortBy,
          sort_order: sortOrder,
        });
        if (cancelled) return;
        setProducts(res.items);
        setTotal(res.total);
        setLastPage(res.lastPage);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedQuery, status, categoryFilter, lowStockOnly, sortBy, sortOrder, refreshKey]);

  function refetch() {
    setRefreshKey((k) => k + 1);
  }

  const canPrev = page > 1;
  const canNext = lastPage !== null ? page < lastPage : products.length === PER_PAGE;

  function exportCSV() {
    downloadCSV(
      "products.csv",
      [
        "SKU",
        "Barcode",
        "Part number",
        "Name",
        "Brand",
        "Condition",
        "Fits",
        "Cost",
        "Retail",
        "Wholesale",
        "Bulk",
        "Stock",
        "Reorder point",
        "Status",
      ],
      products.map((p) => [
        p.sku,
        p.barcode ?? "",
        p.part_number ?? "",
        p.name,
        p.brand ?? "",
        p.condition,
        p.fitment ?? "",
        p.cost_price,
        p.retail_price,
        p.wholesale_price,
        p.bulk_price,
        p.current_stock,
        p.reorder_point,
        p.is_active ? "Active" : "Archived",
      ])
    );
  }

  async function handleSave(payload: ProductWritePayload) {
    setSaving(true);
    setSaveError(null);
    try {
      if (editing === "new") await createProduct(payload);
      else if (editing) await updateProduct(editing.uuid, payload);
      setEditing(null);
      refetch();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteError(null);
    try {
      await deleteProduct(deleting.uuid);
      setDeleting(null);
      refetch();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete product");
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Products"
        subtitle={total !== null ? `${total} product${total === 1 ? "" : "s"} match the current filters` : undefined}
        actions={
          <>
            <Button variant="secondary" onClick={exportCSV} disabled={products.length === 0}>
              <Download size={15} /> Export page CSV
            </Button>
            {canCreate && (
              <Button variant="secondary" onClick={() => setCatModal(true)}>
                <Tags size={15} /> Categories
              </Button>
            )}
            {canCreate && (
              <Button onClick={() => setEditing("new")}>
                <Plus size={15} /> Add product
              </Button>
            )}
          </>
        }
      />

      <div className="card">
        <div className="flex flex-wrap gap-2 border-b border-black/[0.07] p-3">
          <div className="relative w-full max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, SKU, barcode, or part number…"
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onChange={(e) => updateCategoryFilter(e.target.value)} className="w-44">
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.uuid} value={c.uuid}>
                {c.name}
                {!c.is_active ? " (inactive)" : ""}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => updateStatus(e.target.value as StatusFilter)} className="w-32">
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </Select>
          <Select value={sortBy} onChange={(e) => updateSortBy(e.target.value as SortBy)} className="w-40">
            <option value="name">Sort: Name</option>
            <option value="sku">Sort: SKU</option>
            <option value="retail_price">Sort: Price</option>
            <option value="current_stock">Sort: Stock</option>
            <option value="created_at">Sort: Newest</option>
          </Select>
          <Button
            variant="secondary"
            onClick={() => updateSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            title="Toggle sort order"
          >
            {sortOrder === "asc" ? "↑ Asc" : "↓ Desc"}
          </Button>
          <label className="flex items-center gap-1.5 rounded-lg border border-black/10 px-3 text-sm text-ink-secondary">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => updateLowStockOnly(e.target.checked)}
              className="accent-brand"
            />
            Low stock only
          </label>
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
        ) : products.length === 0 ? (
          <EmptyState icon={<Package size={28} />} title="No products match" hint="Adjust the filters or add a product" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Product</Th>
                <Th>SKU / Barcode</Th>
                <Th right>Cost</Th>
                <Th right>Retail</Th>
                <Th right>Wholesale</Th>
                <Th right>Stock</Th>
                {canManageRow && <Th />}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const stock = parseFloat(p.current_stock);
                return (
                  <tr key={p.uuid} className={cx("hover:bg-black/[0.015]", !p.is_active && "opacity-55")}>
                    <Td>
                      <span className="font-medium">{p.name}</span>
                      {p.brand && <span className="ml-2 text-xs text-ink-muted">{p.brand}</span>}
                      {!p.is_active && (
                        <Badge tone="neutral" className="ml-2">
                          Archived
                        </Badge>
                      )}
                      {p.is_vat_exempt && (
                        <Badge tone="brand" className="ml-2">
                          VAT-exempt
                        </Badge>
                      )}
                      {p.fitment && <div className="mt-0.5 text-xs text-ink-muted">Fits: {p.fitment}</div>}
                    </Td>
                    <Td>
                      <span className="font-mono text-xs">{p.sku}</span>
                      {p.barcode && <span className="ml-2 font-mono text-xs text-ink-muted">{p.barcode}</span>}
                      {p.part_number && (
                        <div className="mt-0.5 font-mono text-xs text-ink-muted">P/N: {p.part_number}</div>
                      )}
                    </Td>
                    <Td right>{money(p.cost_price)}</Td>
                    <Td right className="font-medium">
                      {money(p.retail_price)}
                    </Td>
                    <Td right className="text-ink-secondary">{money(p.wholesale_price)}</Td>
                    <Td right>
                      <span className={cx(p.low_stock && "font-semibold text-status-warning", stock <= 0 && "font-semibold text-status-critical")}>
                        {stock}
                      </span>
                    </Td>
                    {canManageRow && (
                      <Td right>
                        <div className="flex justify-end gap-1">
                          {canEdit && (
                            <IconBtn label={`Edit ${p.name}`} onClick={() => openEdit(p)} disabled={editingLoading}>
                              <Pencil size={14} />
                            </IconBtn>
                          )}
                          {canDelete && (
                            <IconBtn label={`Delete ${p.name}`} onClick={() => setDeleting(p)}>
                              <Trash2 size={14} />
                            </IconBtn>
                          )}
                        </div>
                      </Td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}

        {!error && !loading && products.length > 0 && (
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
        <ProductForm
          product={editing === "new" ? null : editing}
          categories={categories}
          units={units}
          saving={saving}
          error={saveError}
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
        title="Delete product"
        message={
          deleteError
            ? deleteError
            : deleting
            ? `Delete "${deleting.name}"? This calls the backend delete endpoint and cannot be undone from here.`
            : ""
        }
      />

      <CategoryManager open={catModal} onClose={() => setCatModal(false)} categories={categories} onChange={refetchCategories} />
    </div>
  );
}

function IconBtn({ children, onClick, label, disabled }: { children: React.ReactNode; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="rounded-md p-1.5 text-ink-muted hover:bg-black/[0.05] hover:text-ink disabled:opacity-40 cursor-pointer"
    >
      {children}
    </button>
  );
}

function ProductForm({
  product,
  categories,
  units,
  saving,
  error,
  onClose,
  onSave,
}: {
  product: ProductDetail | null;
  categories: Category[];
  units: Unit[];
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (payload: ProductWritePayload) => void;
}) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    description: product?.description ?? "",
    brand: product?.brand ?? "",
    size: product?.size ?? "",
    material: product?.material ?? "",
    color: product?.color ?? "",
    partNumber: product?.part_number ?? "",
    fitment: product?.fitment ?? "",
    condition: product?.condition ?? "new",
    categoryId: product?.category?.id != null ? String(product.category.id) : "",
    unitId: product?.unit?.id?.toString() ?? "",
    costPrice: product?.cost_price?.toString() ?? "",
    retailPrice: product?.retail_price?.toString() ?? "",
    wholesalePrice: product?.wholesale_price?.toString() ?? "",
    bulkPrice: product?.bulk_price?.toString() ?? "",
    reorderPoint: product?.reorder_point ?? "0",
    minimumOrderQty: product?.minimum_order_qty ?? "0",
    imageUrl: product?.image_url ?? "",
    isActive: product?.is_active ?? true,
    isVatExempt: product?.is_vat_exempt ?? false,
    trackInventory: product?.track_inventory ?? true,
    allowNegativeStock: product?.allow_negative_stock ?? false,
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const costPrice = parseFloat(form.costPrice) || 0;
  const retailPrice = parseFloat(form.retailPrice) || 0;
  const margin = retailPrice > 0 ? (((retailPrice - costPrice) / retailPrice) * 100).toFixed(1) : "0";
  const valid = form.name.trim().length > 0 && form.sku.trim().length > 0 && retailPrice > 0;

  function submit() {
    onSave({
      name: form.name.trim(),
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || null,
      description: form.description.trim() || null,
      brand: form.brand.trim() || null,
      size: form.size.trim() || null,
      material: form.material.trim() || null,
      color: form.color.trim() || null,
      part_number: form.partNumber.trim() || null,
      fitment: form.fitment.trim() || null,
      condition: form.condition,
      category_id: form.categoryId.trim() ? Number(form.categoryId) : null,
      unit_id: form.unitId.trim() || null,
      cost_price: costPrice,
      retail_price: retailPrice,
      wholesale_price: parseFloat(form.wholesalePrice) || undefined,
      bulk_price: parseFloat(form.bulkPrice) || undefined,
      reorder_point: parseFloat(form.reorderPoint) || 0,
      minimum_order_qty: parseFloat(form.minimumOrderQty) || 0,
      image_url: form.imageUrl.trim() || null,
      is_active: form.isActive,
      is_vat_exempt: form.isVatExempt,
      track_inventory: form.trackInventory,
      allow_negative_stock: form.allowNegativeStock,
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={product ? `Edit ${product.name}` : "Add product"}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={!valid || saving} onClick={submit}>
            {saving ? "Saving…" : product ? "Save changes" : "Add product"}
          </Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name" className="col-span-2">
          <Input autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Spark Plug Standard" />
        </Field>
        <Field label="SKU">
          <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="e.g. SPS-1001" />
        </Field>
        <Field label="Barcode">
          <Input value={form.barcode} onChange={(e) => set("barcode", e.target.value)} placeholder="EAN / UPC" />
        </Field>
        <Field label="Brand">
          <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} />
        </Field>
        <Field label="Size">
          <Input value={form.size} onChange={(e) => set("size", e.target.value)} placeholder="e.g. 1pc" />
        </Field>
        <Field label="Part number">
          <Input
            value={form.partNumber}
            onChange={(e) => set("partNumber", e.target.value)}
            placeholder="OEM / manufacturer part no."
          />
        </Field>
        <Field label="Condition">
          <Select value={form.condition} onChange={(e) => set("condition", e.target.value as ProductCondition)}>
            <option value="new">New</option>
            <option value="oem">OEM</option>
            <option value="aftermarket">Aftermarket</option>
            <option value="refurbished">Refurbished</option>
            <option value="used">Used</option>
          </Select>
        </Field>
        <Field label="Compatible vehicles" className="col-span-2">
          <Input
            value={form.fitment}
            onChange={(e) => set("fitment", e.target.value)}
            placeholder="e.g. Toyota Vios 2014-2018, Honda City 2015-2020"
          />
        </Field>
        <Field label="Category">
          <Select value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
            <option value="">Uncategorized</option>
            {categories
              .filter((c) => c.is_active || String(c.id) === form.categoryId)
              .map((c) => (
                <option key={c.uuid} value={c.id}>
                  {c.name}
                  {!c.is_active ? " (inactive)" : ""}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Unit">
          <Select value={form.unitId} onChange={(e) => set("unitId", e.target.value)}>
            <option value="">No unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.abbreviation})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cost price">
          <Input type="number" min={0} step={0.01} value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} />
        </Field>
        <Field label="Retail price">
          <Input type="number" min={0} step={0.01} value={form.retailPrice} onChange={(e) => set("retailPrice", e.target.value)} />
        </Field>
        <Field label="Wholesale price">
          <Input type="number" min={0} step={0.01} value={form.wholesalePrice} onChange={(e) => set("wholesalePrice", e.target.value)} />
        </Field>
        <Field label="Bulk price">
          <Input type="number" min={0} step={0.01} value={form.bulkPrice} onChange={(e) => set("bulkPrice", e.target.value)} />
        </Field>
        <Field label="Reorder point">
          <Input type="number" min={0} step={0.01} value={form.reorderPoint} onChange={(e) => set("reorderPoint", e.target.value)} />
        </Field>
        <Field label="Minimum order qty">
          <Input type="number" min={0} step={0.01} value={form.minimumOrderQty} onChange={(e) => set("minimumOrderQty", e.target.value)} />
        </Field>
        <Field label="Image URL" className="col-span-2">
          <Input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…" />
        </Field>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg bg-black/[0.04] px-3 py-2">
        <span className="text-xs text-ink-secondary">Gross margin at these prices</span>
        <span className={cx("text-sm font-semibold", parseFloat(margin) < 0 && "text-status-critical")}>{margin}%</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="accent-brand" />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isVatExempt} onChange={(e) => set("isVatExempt", e.target.checked)} className="accent-brand" />
          VAT-exempt
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.trackInventory} onChange={(e) => set("trackInventory", e.target.checked)} className="accent-brand" />
          Track inventory
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.allowNegativeStock}
            onChange={(e) => set("allowNegativeStock", e.target.checked)}
            className="accent-brand"
          />
          Allow negative stock
        </label>
      </div>
    </Modal>
  );
}

/** Categories with no sort_order yet (e.g. freshly created) sort after every explicitly ordered one. */
function sortOrderOf(c: Category): number {
  return c.sort_order ?? Number.MAX_SAFE_INTEGER;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface CategoryFormValues {
  name: string;
  description: string;
  isActive: boolean;
}

function CategoryFields({
  values,
  onChange,
}: {
  values: CategoryFormValues;
  onChange: (values: CategoryFormValues) => void;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <Input
        autoFocus
        value={values.name}
        onChange={(e) => onChange({ ...values, name: e.target.value })}
        placeholder="Category name"
      />
      <Textarea
        value={values.description}
        onChange={(e) => onChange({ ...values, description: e.target.value })}
        placeholder="Description (optional)"
        className="min-h-16 text-sm"
      />
      <label className="flex w-fit items-center gap-2 text-sm text-ink-secondary">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => onChange({ ...values, isActive: e.target.checked })}
          className="accent-brand"
        />
        Active
      </label>
    </div>
  );
}

function CategoryManager({
  open,
  onClose,
  categories,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onChange: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [addValues, setAddValues] = useState<CategoryFormValues>({ name: "", description: "", isActive: true });
  const [savingAdd, setSavingAdd] = useState(false);

  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<CategoryFormValues>({ name: "", description: "", isActive: true });
  const [savingEdit, setSavingEdit] = useState(false);

  const [reorderingUuid, setReorderingUuid] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...categories].sort((a, b) => sortOrderOf(a) - sortOrderOf(b) || a.name.localeCompare(b.name)),
    [categories]
  );

  async function submitAdd() {
    if (!addValues.name.trim()) return;
    setSavingAdd(true);
    setError(null);
    try {
      await createCategory({
        name: addValues.name.trim(),
        slug: slugify(addValues.name),
        description: addValues.description.trim() || null,
        is_active: addValues.isActive,
      });
      setAddValues({ name: "", description: "", isActive: true });
      setAdding(false);
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create category");
    } finally {
      setSavingAdd(false);
    }
  }

  function startEdit(c: Category) {
    setEditingUuid(c.uuid);
    setEditValues({ name: c.name, description: c.description ?? "", isActive: c.is_active });
    setError(null);
  }

  async function submitEdit(c: Category) {
    if (!editValues.name.trim()) return;
    setSavingEdit(true);
    setError(null);
    try {
      await updateCategory(c.uuid, {
        name: editValues.name.trim(),
        description: editValues.description.trim() || null,
        is_active: editValues.isActive,
      });
      setEditingUuid(null);
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save category");
    } finally {
      setSavingEdit(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;
    const moving = sorted[index];
    setReorderingUuid(moving.uuid);
    setError(null);
    try {
      const reordered = [...sorted];
      const [item] = reordered.splice(index, 1);
      reordered.splice(targetIndex, 0, item);
      const updates = reordered
        .map((c, i) => (sortOrderOf(c) !== i ? updateCategory(c.uuid, { sort_order: i }) : null))
        .filter((p): p is Promise<Category> => p !== null);
      await Promise.all(updates);
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reorder categories");
    } finally {
      setReorderingUuid(null);
    }
  }

  async function remove() {
    if (!deleting) return;
    setError(null);
    try {
      await deleteCategory(deleting.uuid);
      setDeleting(null);
      onChange();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete category");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Manage categories" width="max-w-xl">
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}

      <div className="mb-4 rounded-[0.3rem] border border-black/[0.07] bg-black/[0.015] p-3.5">
        {adding ? (
          <div className="flex flex-col gap-3">
            <CategoryFields values={addValues} onChange={setAddValues} />
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setAdding(false);
                  setAddValues({ name: "", description: "", isActive: true });
                }}
                disabled={savingAdd}
              >
                Cancel
              </Button>
              <Button size="sm" disabled={!addValues.name.trim() || savingAdd} onClick={submitAdd}>
                {savingAdd ? "Adding…" : "Add category"}
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1.5 text-sm font-medium text-brand-strong hover:bg-brand-soft cursor-pointer"
          >
            <Plus size={15} /> Add category
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {sorted.map((c, i) => {
          const isEditing = editingUuid === c.uuid;
          return (
            <div
              key={c.uuid}
              className={cx(
                "rounded-[0.3rem] border border-black/[0.07] px-3.5 py-3 transition-colors",
                !isEditing && !c.is_active && "opacity-60",
                !isEditing && "hover:border-black/[0.12]"
              )}
            >
              {isEditing ? (
                <div className="flex flex-col gap-3">
                  <CategoryFields values={editValues} onChange={setEditValues} />
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditingUuid(null)} disabled={savingEdit}>
                      Cancel
                    </Button>
                    <Button size="sm" disabled={!editValues.name.trim() || savingEdit} onClick={() => submitEdit(c)}>
                      {savingEdit ? "Saving…" : "Save"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex flex-col pt-0.5">
                    <button
                      onClick={() => move(i, -1)}
                      disabled={i === 0 || reorderingUuid !== null}
                      aria-label={`Move ${c.name} up`}
                      title="Move up"
                      className="rounded p-0.5 text-ink-muted hover:bg-black/[0.05] hover:text-ink disabled:pointer-events-none disabled:opacity-25 cursor-pointer"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      onClick={() => move(i, 1)}
                      disabled={i === sorted.length - 1 || reorderingUuid !== null}
                      aria-label={`Move ${c.name} down`}
                      title="Move down"
                      className="rounded p-0.5 text-ink-muted hover:bg-black/[0.05] hover:text-ink disabled:pointer-events-none disabled:opacity-25 cursor-pointer"
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{c.name}</span>
                      <Badge tone={c.is_active ? "good" : "neutral"}>{c.is_active ? "Active" : "Inactive"}</Badge>
                      <Badge tone="brand">{c.products_count ?? 0} items</Badge>
                    </div>
                    {c.description && <p className="mt-1 text-xs text-ink-muted">{c.description}</p>}
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => startEdit(c)}
                      aria-label={`Edit ${c.name}`}
                      title="Edit category"
                      className="rounded-md p-1.5 text-ink-muted hover:bg-black/[0.05] hover:text-ink cursor-pointer"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDeleting(c)}
                      aria-label={`Delete ${c.name}`}
                      title="Delete category"
                      className="rounded-md p-1.5 text-ink-muted hover:bg-black/[0.05] hover:text-status-critical cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {sorted.length === 0 && !adding && (
          <p className="py-6 text-center text-sm text-ink-muted">No categories yet — add your first one above.</p>
        )}
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="Delete category"
        message={deleting ? `Delete "${deleting.name}"? Products in this category will become uncategorized.` : ""}
      />
    </Modal>
  );
}

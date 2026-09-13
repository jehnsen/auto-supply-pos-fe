"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  Download,
  History,
  Minus,
  Package,
  PackageMinus,
  PackagePlus,
  Search,
  Warehouse,
} from "lucide-react";
import {
  adjustProductStock,
  getProductStockHistory,
  listProducts,
  type ProductListItem,
  type StockHistoryEntry,
} from "@/lib/api/products";
import {
  getInventoryValuationReport,
  getLowStockReport,
  getStockMovementReport,
  type InventoryValuationReport,
  type LowStockReportRow,
  type StockMovementRow,
} from "@/lib/api/reports";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { cx, dayKey, daysAgo, downloadCSV, formatDateTime, formatNumber, formatQty, toNum, formatMoney, formatMoneyCompact } from "@/lib/utils";
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
import { StatTile } from "@/components/charts";

type Tab = "stock" | "low" | "history";
type AdjustType = "received" | "count" | "damaged" | "adjustment";

const PER_PAGE = 20;

export default function InventoryPage() {
  const currency = useAuthStore((s) => s.user?.store.currency) ?? "PHP";
  const canAdjust = useAuthStore(
    (s) =>
      hasPermission(s.user?.role, s.permissions, PERMISSIONS.INVENTORY_ADJUST) ||
      hasPermission(s.user?.role, s.permissions, PERMISSIONS.INVENTORY_RECEIVE) ||
      hasPermission(s.user?.role, s.permissions, PERMISSIONS.PRODUCTS_ADJUST_STOCK)
  );
  const money = (n: number) => formatMoney(n, currency);
  const moneyCompact = (n: number) => formatMoneyCompact(n, currency);

  const [tab, setTab] = useState<Tab>("stock");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  const [stockItems, setStockItems] = useState<ProductListItem[]>([]);
  const [stockTotal, setStockTotal] = useState<number | null>(null);
  const [stockLastPage, setStockLastPage] = useState<number | null>(null);
  const [lowStock, setLowStock] = useState<LowStockReportRow[]>([]);
  const [history, setHistory] = useState<StockMovementRow[]>([]);
  const [valuation, setValuation] = useState<InventoryValuationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adjusting, setAdjusting] = useState<ProductListItem | null>(null);
  const [historyProduct, setHistoryProduct] = useState<ProductListItem | null>(null);

  useEffect(() => {
    getInventoryValuationReport()
      .then(setValuation)
      .catch(() => {});
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        if (tab === "stock") {
          const res = await listProducts({ page, per_page: PER_PAGE, is_active: true, sort_by: "name", sort_order: "asc" });
          if (cancelled) return;
          setStockItems(res.items);
          setStockTotal(res.total);
          setStockLastPage(res.lastPage);
        } else if (tab === "low") {
          const res = await getLowStockReport();
          if (cancelled) return;
          setLowStock(res.data);
        } else {
          const res = await getStockMovementReport(dayKey(daysAgo(30)), dayKey(new Date()));
          if (cancelled) return;
          setHistory(res.data);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load inventory data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [tab, page, refreshKey]);

  function refetch() {
    setRefreshKey((k) => k + 1);
  }

  const filteredStock = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stockItems;
    return stockItems.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [stockItems, query]);

  const filteredLow = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return lowStock;
    return lowStock.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [lowStock, query]);

  const filteredHistory = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return history;
    return history.filter((m) => (m.product?.name ?? "").toLowerCase().includes(q) || (m.reason ?? "").toLowerCase().includes(q));
  }, [history, query]);

  function exportStock() {
    downloadCSV(
      "inventory-valuation.csv",
      ["SKU", "Name", "Stock", "Cost", "Retail"],
      stockItems.map((p) => [p.sku, p.name, p.current_stock, p.cost_price, p.retail_price])
    );
  }

  const canPrev = page > 1;
  const canNext = stockLastPage !== null ? page < stockLastPage : stockItems.length === PER_PAGE;

  return (
    <div className="p-6">
      <PageHeader
        title="Inventory"
        subtitle="Stock levels, valuation, and movement history"
        actions={
          <Button variant="secondary" onClick={exportStock} disabled={stockItems.length === 0}>
            <Download size={15} /> Export page CSV
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile label="Active products" value={formatNumber(valuation?.summary.total_products ?? 0)} icon={<Boxes size={15} />} />
        <StatTile label="Units on hand" value={formatNumber(Math.round(valuation?.summary.total_units ?? 0))} icon={<Warehouse size={15} />} />
        <StatTile label="Inventory value" value={moneyCompact(valuation?.summary.total_value ?? 0)} icon={<PackagePlus size={15} />} />
        <StatTile label="Low stock" value={formatNumber(lowStock.length)} icon={<PackageMinus size={15} />} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Segmented<Tab>
          value={tab}
          onChange={(v) => {
            setTab(v);
            setPage(1);
          }}
          options={[
            { value: "stock", label: `Stock levels${stockTotal !== null ? ` (${stockTotal})` : ""}` },
            { value: "low", label: "Low stock" },
            { value: "history", label: "Movement history (30d)" },
          ]}
        />
        <div className="relative w-64">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="pl-9" />
        </div>
      </div>

      <div className="card">
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
        ) : tab === "stock" ? (
          filteredStock.length === 0 ? (
            <EmptyState icon={<Boxes size={28} />} title="No products match" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>SKU</Th>
                  <Th right>On hand</Th>
                  <Th>Status</Th>
                  <Th right>Cost value</Th>
                  <Th right>Retail value</Th>
                  <Th right>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((p) => {
                  const stock = parseFloat(p.current_stock);
                  const out = stock <= 0;
                  return (
                    <tr key={p.uuid} className="hover:bg-black/[0.015]">
                      <Td className="font-medium">{p.name}</Td>
                      <Td>
                        <span className="font-mono text-xs">{p.sku}</span>
                      </Td>
                      <Td right className={cx("font-medium", out && "text-status-critical", p.low_stock && !out && "text-status-warning")}>
                        {stock}
                      </Td>
                      <Td>
                        {out ? (
                          <Badge tone="critical">Out of stock</Badge>
                        ) : p.low_stock ? (
                          <Badge tone="warning">Low stock</Badge>
                        ) : (
                          <Badge tone="good">In stock</Badge>
                        )}
                      </Td>
                      <Td right>{money(Math.max(stock, 0) * p.cost_price)}</Td>
                      <Td right>{money(Math.max(stock, 0) * p.retail_price)}</Td>
                      <Td right>
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => setHistoryProduct(p)} className="border border-black/10" title="Stock movement history">
                            <History size={14} />
                          </Button>
                          {canAdjust && (
                            <Button size="sm" variant="secondary" onClick={() => setAdjusting(p)}>
                              Adjust
                            </Button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )
        ) : tab === "low" ? (
          filteredLow.length === 0 ? (
            <EmptyState icon={<AlertTriangle size={28} />} title="Nothing needs reordering" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Product</Th>
                  <Th>SKU</Th>
                  <Th right>On hand</Th>
                  <Th right>Reorder at</Th>
                  <Th right>Days until stockout</Th>
                  <Th>Urgency</Th>
                </tr>
              </thead>
              <tbody>
                {filteredLow.map((p) => (
                  <tr key={p.uuid} className="hover:bg-black/[0.015]">
                    <Td className="font-medium">{p.name}</Td>
                    <Td>
                      <span className="font-mono text-xs">{p.sku}</span>
                    </Td>
                    <Td right className={cx("font-medium", p.current_stock <= 0 && "text-status-critical")}>
                      {formatQty(p.current_stock)} {p.unit}
                    </Td>
                    <Td right className="text-ink-secondary">
                      {formatQty(p.reorder_point)}
                    </Td>
                    <Td right>{p.estimated_days_until_stockout ?? "—"}</Td>
                    <Td>
                      <Badge tone={p.urgency === "high" ? "critical" : p.urgency === "medium" ? "warning" : "neutral"}>{p.urgency}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )
        ) : filteredHistory.length === 0 ? (
          <EmptyState icon={<History size={28} />} title="No stock movements in the last 30 days" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Product</Th>
                <Th>Type</Th>
                <Th right>Qty change</Th>
                <Th>Reason</Th>
                <Th>By</Th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((m) => (
                <tr key={m.uuid} className="hover:bg-black/[0.015]">
                  <Td className="whitespace-nowrap text-ink-secondary">{formatDateTime(m.date)}</Td>
                  <Td className="font-medium">{m.product?.name ?? "—"}</Td>
                  <Td>
                    <Badge tone="neutral">{m.type.replace(/_/g, " ")}</Badge>
                  </Td>
                  <Td right className={cx("font-medium", toNum(m.quantity_change) > 0 ? "text-[#006300]" : "text-ink")}>
                    {toNum(m.quantity_change) > 0 ? "+" : ""}
                    {formatQty(m.quantity_change)}
                  </Td>
                  <Td className="text-ink-secondary">{m.reason}</Td>
                  <Td className="text-ink-secondary">{m.user.name}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {tab === "stock" && !error && !loading && filteredStock.length > 0 && (
          <div className="flex items-center justify-between border-t border-black/[0.07] px-3 py-2.5 text-xs text-ink-secondary">
            <span>
              Page {page}
              {stockLastPage ? ` of ${stockLastPage}` : ""}
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

      {adjusting && (
        <AdjustModal
          product={adjusting}
          onClose={() => setAdjusting(null)}
          onApplied={() => {
            setAdjusting(null);
            refetch();
          }}
        />
      )}

      {historyProduct && <StockHistoryModal product={historyProduct} onClose={() => setHistoryProduct(null)} />}
    </div>
  );
}

function AdjustModal({
  product,
  onClose,
  onApplied,
}: {
  product: ProductListItem;
  onClose: () => void;
  onApplied: () => void;
}) {
  const [type, setType] = useState<AdjustType>("received");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStock = parseFloat(product.current_stock);
  const num = parseFloat(value) || 0;
  const delta = type === "count" ? Math.round((num - currentStock) * 100) / 100 : type === "damaged" ? -Math.abs(num) : type === "received" ? Math.abs(num) : num;
  const newStock = Math.round((currentStock + delta) * 100) / 100;
  const valid = value !== "" && !Number.isNaN(parseFloat(value)) && delta !== 0 && newStock >= 0;

  const reasons: Record<AdjustType, string> = {
    received: "Stock received",
    count: "Stock count adjustment",
    damaged: "Damaged / waste",
    adjustment: "Manual correction",
  };

  async function apply() {
    setSaving(true);
    setError(null);
    try {
      // "count" sets the drawer to the counted total (native `set`); the others
      // add/subtract by the delta computed above.
      const adjustment_type = type === "count" ? "set" : delta >= 0 ? "add" : "subtract";
      const quantity = type === "count" ? num : Math.abs(delta);
      await adjustProductStock(product.uuid, {
        quantity,
        adjustment_type,
        reason: reasons[type],
        notes: notes.trim() || undefined,
      });
      onApplied();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to adjust stock");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Adjust stock · ${product.name}`}
      width="max-w-sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={!valid || saving} onClick={apply}>
            {saving ? "Applying…" : "Apply"}
          </Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-lg bg-black/[0.04] px-3 py-2 text-sm">
          <span className="text-ink-secondary">Current stock</span>
          <span className="font-semibold">{currentStock}</span>
        </div>
        <Field label="Adjustment type">
          <Select value={type} onChange={(e) => setType(e.target.value as AdjustType)}>
            <option value="received">Stock received (add)</option>
            <option value="count">Stock count (set exact quantity)</option>
            <option value="damaged">Damaged / waste (remove)</option>
            <option value="adjustment">Manual correction (+/−)</option>
          </Select>
        </Field>
        <Field label={type === "count" ? "Counted quantity" : "Quantity"}>
          <Input
            type="number"
            autoFocus
            step={0.01}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={type === "adjustment" ? "e.g. -2 or 5" : "e.g. 24"}
          />
        </Field>
        <Field label="Notes (optional)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. PO #1042 from Dunlop Distributor" className="min-h-16" />
        </Field>
        {value !== "" && (
          <div className={cx("rounded-lg px-3 py-2 text-sm", newStock < 0 ? "bg-red-50 text-red-800" : "bg-brand-soft text-brand-strong")}>
            {newStock < 0 ? "This would take stock below zero." : `New stock level: ${newStock} (${delta > 0 ? "+" : ""}${delta})`}
          </div>
        )}
      </div>
    </Modal>
  );
}

const MOVEMENT_TONES: Record<string, "good" | "warning" | "critical" | "brand" | "neutral"> = {
  stock_in: "good",
  purchase_order: "good",
  received: "good",
  adjustment: "brand",
  count: "brand",
  sale: "neutral",
  stock_out: "warning",
  damaged: "critical",
  waste: "critical",
  void: "warning",
  refund: "warning",
};

function referenceLabel(entry: StockHistoryEntry): string | null {
  if (!entry.reference_type || entry.reference_id == null) return null;
  const map: Record<string, string> = {
    purchase_order: "PO",
    sale: "Sale",
    delivery: "Delivery",
    adjustment: "Adj",
  };
  const prefix = map[entry.reference_type] ?? entry.reference_type.replace(/_/g, " ");
  return `${prefix} #${entry.reference_id}`;
}

/** Trim trailing zeros so 178.0000 → 178 and 2.5000 → 2.5. */

function StockHistoryModal({ product, onClose }: { product: ProductListItem; onClose: () => void }) {
  const [entries, setEntries] = useState<StockHistoryEntry[]>([]);
  const [currentStock, setCurrentStock] = useState<number>(parseFloat(product.current_stock));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await getProductStockHistory(product.uuid);
        if (!cancelled) {
          setEntries(res.history ?? []);
          setCurrentStock(res.product.current_stock);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load stock history");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [product.uuid]);

  return (
    <Modal open onClose={onClose} title={`Stock history · ${product.name}`} width="max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[0.3rem] border border-black/[0.06] bg-gradient-to-br from-brand-soft to-transparent px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand text-white shadow-sm">
            <Package size={18} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{product.name}</p>
            <p className="font-mono text-xs text-ink-muted">{product.sku}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-ink-muted">Current stock</p>
          <p className="tabular text-xl font-semibold leading-tight text-brand-strong">{formatQty(currentStock)}</p>
        </div>
      </div>

      {error ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <AlertTriangle size={22} className="text-status-critical" />
          <p className="text-sm font-medium text-status-critical">{error}</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="sm" />
        </div>
      ) : entries.length === 0 ? (
        <EmptyState icon={<History size={26} />} title="No stock movements recorded" hint="Sales, receiving, and adjustments will appear here." />
      ) : (
        <div className="-mx-1 max-h-[58vh] space-y-1.5 overflow-y-auto px-1">
          {entries.map((e) => (
            <StockMovementRow key={e.uuid} entry={e} />
          ))}
        </div>
      )}
    </Modal>
  );
}

function StockMovementRow({ entry: e }: { entry: StockHistoryEntry }) {
  const ref = referenceLabel(e);
  const change = toNum(e.quantity_change);
  const dir = change > 0 ? "up" : change < 0 ? "down" : "flat";
  const DirIcon = dir === "up" ? ArrowUpRight : dir === "down" ? ArrowDownRight : Minus;

  return (
    <div className="group flex gap-3 rounded-[0.3rem] border border-black/[0.06] bg-card p-3 transition-colors hover:border-black/10 hover:bg-black/[0.012]">
      {/* Direction indicator */}
      <span
        className={cx(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          dir === "up" && "bg-emerald-50 text-[#006300]",
          dir === "down" && "bg-red-50 text-status-critical",
          dir === "flat" && "bg-black/[0.05] text-ink-muted"
        )}
      >
        <DirIcon size={17} />
      </span>

      <div className="min-w-0 flex-1">
        {/* Top line: badge + change, then before → after */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <div className="flex items-center gap-2">
            <Badge tone={MOVEMENT_TONES[e.type] ?? "neutral"}>{e.type.replace(/_/g, " ")}</Badge>
            <span
              className={cx(
                "tabular text-sm font-semibold",
                dir === "up" ? "text-[#006300]" : dir === "down" ? "text-status-critical" : "text-ink-muted"
              )}
            >
              {change > 0 ? "+" : ""}
              {formatQty(e.quantity_change)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded-md bg-black/[0.035] px-2 py-1 text-xs">
            <span className="tabular text-ink-secondary">{formatQty(e.quantity_before)}</span>
            <ArrowRight size={12} className="text-ink-muted" />
            <span className="tabular font-semibold text-ink">{formatQty(e.quantity_after)}</span>
          </div>
        </div>

        {/* Reason + notes */}
        {(e.reason || e.notes) && (
          <p className="mt-1.5 text-sm text-ink-secondary">
            {e.reason}
            {e.notes && <span className="text-ink-muted"> — {e.notes}</span>}
          </p>
        )}

        {/* Meta footer */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-ink-muted">
          <span className="whitespace-nowrap">{formatDateTime(e.created_at)}</span>
          {e.user?.name && (
            <>
              <span className="text-ink-muted/40">·</span>
              <span>{e.user.name}</span>
            </>
          )}
          {ref && (
            <>
              <span className="text-ink-muted/40">·</span>
              <span className="font-mono">{ref}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

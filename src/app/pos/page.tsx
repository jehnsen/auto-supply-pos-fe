"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  Building2,
  CreditCard,
  DoorOpen,
  Keyboard,
  Landmark,
  Maximize2,
  Minimize2,
  Minus,
  PauseCircle,
  Plus,
  Printer,
  ScanBarcode,
  Search,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import {
  createSale,
  discardHeldSale,
  getSaleReceipt,
  holdSale,
  listHeldSales,
  resumeHeldSale,
  type HeldTransaction,
  type SalePaymentMethod,
  type SaleReceipt,
} from "@/lib/api/sales";
import { getProductByBarcode, getProductByUuid, listProducts, searchProducts, type ProductListItem, type ProductSearchResult } from "@/lib/api/products";
import { getCustomer, type Customer } from "@/lib/api/customers";
import { listCategories, type Category } from "@/lib/api/categories";
import { getTaxSettings } from "@/lib/api/settings";
import { getCurrentShift, type Shift } from "@/lib/api/shifts";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { cx, round2, formatMoney } from "@/lib/utils";
import { Badge, Button, EmptyState, Field, Input, Modal, Spinner } from "@/components/ui";
import { CategoryGlyph, CategoryIcon, getCategoryBorder, getCategoryChip } from "@/lib/category-icons";
import { CustomerPicker } from "@/components/CustomerPicker";
import ApiReceipt from "@/components/ApiReceipt";

interface PosProduct {
  uuid: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  stock: number;
  lowStock?: boolean;
  /** Not returned by the lean search endpoint, only by the browse/list endpoint. */
  categorySlug?: string | null;
  /** Fitment line on the tile — what a parts counter actually reads off the shelf. */
  brand?: string | null;
  size?: string | null;
}

interface CartLine {
  productId: string;
  name: string;
  sku: string;
  price: number;
  qty: number;
  stock: number;
}

function fromListItem(p: ProductListItem): PosProduct {
  return {
    uuid: p.uuid,
    name: p.name,
    sku: p.sku,
    barcode: p.barcode,
    price: p.retail_price,
    stock: parseFloat(p.current_stock),
    lowStock: p.low_stock,
    categorySlug: p.category?.slug,
    brand: p.brand,
    size: p.size,
  };
}

function fromSearchResult(p: ProductSearchResult): PosProduct {
  return { uuid: p.uuid, name: p.name, sku: p.sku, barcode: p.barcode, price: p.price, stock: parseFloat(p.stock) };
}

/** Safari still needs the webkit-prefixed Fullscreen API. */
type FullscreenDocument = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> };
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };

function currentFullscreenElement(): Element | null {
  const doc = document as FullscreenDocument;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function requestFullscreen(el: HTMLElement): Promise<void> | undefined {
  return el.requestFullscreen ? el.requestFullscreen() : (el as FullscreenElement).webkitRequestFullscreen?.();
}

function exitFullscreen(): Promise<void> | undefined {
  const doc = document as FullscreenDocument;
  return document.exitFullscreen ? document.exitFullscreen() : doc.webkitExitFullscreen?.();
}

export default function PosPage() {
  const currency = useAuthStore((s) => s.user?.store.currency) ?? "PHP";
  const money = (n: number) => formatMoney(n, currency);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [browseItems, setBrowseItems] = useState<ProductListItem[]>([]);
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  /** Category uuid, or "" for all categories. */
  const [categoryUuid, setCategoryUuid] = useState("");

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const customerId = selectedCustomer?.uuid ?? "";

  const [cart, setCart] = useState<CartLine[]>([]);
  const [vatRate, setVatRate] = useState(12);
  const [vatInclusive, setVatInclusive] = useState(true);

  const [payModal, setPayModal] = useState(false);
  const [holdModal, setHoldModal] = useState(false);
  const [heldModal, setHeldModal] = useState(false);
  const [heldList, setHeldList] = useState<HeldTransaction[]>([]);
  const [lastReceipt, setLastReceipt] = useState<SaleReceipt | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const posRootRef = useRef<HTMLDivElement>(null);

  const [shift, setShift] = useState<Shift | null>(null);
  const [shiftChecked, setShiftChecked] = useState(false);
  const noOpenShift = shiftChecked && !shift;
  const anyModalOpen = payModal || holdModal || heldModal || lastReceipt !== null || shortcutsOpen;

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(currentFullscreenElement() === posRootRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    };
  }, []);

  function toggleFullscreen() {
    if (currentFullscreenElement()) {
      exitFullscreen()?.catch(() => {});
      return;
    }
    const el = posRootRef.current;
    if (!el) return;
    requestFullscreen(el)?.catch(() => showFlash("Fullscreen isn't supported in this browser"));
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // The lean /products/search endpoint omits `category`, so it can't answer a chip-filtered query.
  // Fall back to the browse endpoint — it takes `q` and `category` together — whenever a chip is on.
  const leanSearch = !!debouncedQuery && !categoryUuid;

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoadingProducts(true);
      try {
        if (leanSearch) {
          const items = await searchProducts(debouncedQuery);
          if (!cancelled) setSearchResults(items);
        } else {
          const res = await listProducts({
            per_page: 60,
            is_active: true,
            sort_by: "name",
            sort_order: "asc",
            q: debouncedQuery || undefined,
            categoryUuid: categoryUuid || undefined,
          });
          if (!cancelled) setBrowseItems(res.items);
        }
      } catch {
        // Leave existing results in place on error
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [leanSearch, debouncedQuery, categoryUuid]);

  useEffect(() => {
    getTaxSettings()
      .then((t) => {
        setVatRate(t.vat_rate);
        setVatInclusive(t.vat_inclusive);
      })
      .catch(() => {});
    getCurrentShift()
      .then(setShift)
      .catch(() => setShift(null))
      .finally(() => setShiftChecked(true));
    listCategories()
      .then((res) => setCategories(res.items))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!heldModal) return;
    listHeldSales()
      .then(setHeldList)
      .catch(() => setHeldList([]));
  }, [heldModal]);

  const displayItems: PosProduct[] = useMemo(
    () => (leanSearch ? searchResults.map(fromSearchResult) : browseItems.map(fromListItem)),
    [leanSearch, searchResults, browseItems]
  );

  const categoryChips = useMemo(
    () => categories.filter((c) => c.is_active && c.products_count !== 0).sort((a, b) => a.sort_order - b.sort_order),
    [categories]
  );

  const subtotal = round2(cart.reduce((s, i) => s + i.price * i.qty, 0));
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);
  // Mirror the API's math: integer centavos, VAT from store settings, rounded once at the end.
  // The payments we send must equal the server-computed total within 1 centavo.
  const toCentavos = (pesos: number) => Math.round(pesos * 100);
  const subtotalCentavos = cart.reduce((s, i) => s + i.qty * toCentavos(i.price), 0);
  const totalCentavos = Math.round(vatInclusive ? subtotalCentavos : subtotalCentavos * (1 + vatRate / 100));
  const estimatedTotal = totalCentavos / 100;
  const estimatedVat = vatInclusive ? round2(subtotal - subtotal / (1 + vatRate / 100)) : round2(estimatedTotal - subtotal);

  const inCartQty = (uuid: string) => cart.find((i) => i.productId === uuid)?.qty ?? 0;

  function showFlash(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(null), 2000);
  }

  function addToCart(p: PosProduct) {
    const existing = cart.find((i) => i.productId === p.uuid);
    const current = existing?.qty ?? 0;
    if (current + 1 > p.stock) {
      showFlash(`Only ${p.stock} of ${p.name} in stock`);
      return;
    }
    if (existing) {
      setCart(cart.map((i) => (i.productId === p.uuid ? { ...i, qty: i.qty + 1 } : i)));
    } else {
      setCart([...cart, { productId: p.uuid, name: p.name, sku: p.sku, price: p.price, qty: 1, stock: p.stock }]);
    }
  }

  function setQty(productId: string, qty: number) {
    const line = cart.find((i) => i.productId === productId);
    if (!line) return;
    if (qty > line.stock) {
      showFlash(`Only ${line.stock} in stock`);
      qty = line.stock;
    }
    if (qty <= 0) setCart(cart.filter((i) => i.productId !== productId));
    else setCart(cart.map((i) => (i.productId === productId ? { ...i, qty } : i)));
  }

  function clearCart() {
    setCart([]);
    setSelectedCustomer(null);
  }

  function onSearchEnter() {
    const q = query.trim();
    if (!q) return;
    // displayItems only reflects `q` once the 300ms search debounce has caught up. A barcode
    // scanner types + sends Enter faster than that, so falling back to a stale/default list here
    // would silently add the wrong product instead of looking up the scanned barcode.
    if (debouncedQuery === q) {
      const exactBarcode = displayItems.find((p) => p.barcode === q);
      if (exactBarcode) {
        addToCart(exactBarcode);
        setQuery("");
        return;
      }
      if (displayItems.length > 0) {
        addToCart(displayItems[0]);
        setQuery("");
        return;
      }
    }
    getProductByBarcode(q)
      .then((detail) => {
        addToCart({ uuid: detail.uuid, name: detail.name, sku: detail.sku, barcode: detail.barcode, price: detail.retail_price, stock: parseFloat(detail.current_stock) });
        setQuery("");
      })
      .catch(() => showFlash("No product matches that search or barcode"));
  }

  async function resumeHeld(id: number) {
    if (cart.length > 0) {
      showFlash("Clear or hold the current sale first");
      return;
    }
    try {
      // Resuming deletes the held transaction on the server; cart_data unit_price is centavos
      const resumed = await resumeHeldSale(id);
      const lines: CartLine[] = await Promise.all(
        resumed.items.map(async (it) => {
          const pricePesos = it.unit_price / 100;
          const found = displayItems.find((p) => p.uuid === it.product_id);
          if (found) return { productId: it.product_id, name: found.name, sku: found.sku, price: pricePesos, qty: it.quantity, stock: found.stock };
          try {
            const detail = await getProductByUuid(it.product_id);
            return { productId: it.product_id, name: detail.name, sku: detail.sku, price: pricePesos, qty: it.quantity, stock: parseFloat(detail.current_stock) };
          } catch {
            return { productId: it.product_id, name: "Unknown product", sku: "", price: pricePesos, qty: it.quantity, stock: it.quantity };
          }
        })
      );
      setCart(lines);
      if (resumed.customer_id) {
        getCustomer(resumed.customer_id)
          .then(setSelectedCustomer)
          .catch(() => setSelectedCustomer(null));
      } else {
        setSelectedCustomer(null);
      }
      setHeldModal(false);
    } catch (err) {
      showFlash(err instanceof ApiError ? err.message : "Failed to resume held sale");
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (anyModalOpen) return;
      const target = e.target as HTMLElement | null;
      const isTyping = !!target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);

      switch (e.key) {
        case "F2":
          e.preventDefault();
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
          break;
        case "F3":
          e.preventDefault();
          setHeldModal(true);
          break;
        case "F4":
          e.preventDefault();
          if (cart.length > 0) setHoldModal(true);
          else showFlash("Cart is empty");
          break;
        case "F6":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "F8":
          e.preventDefault();
          if (cart.length > 0) clearCart();
          break;
        case "F9":
          e.preventDefault();
          if (cart.length === 0) showFlash("Cart is empty");
          else if (noOpenShift) showFlash("Open a shift before charging a sale");
          else setPayModal(true);
          break;
        case "?":
          if (!isTyping) {
            e.preventDefault();
            setShortcutsOpen(true);
          }
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anyModalOpen, cart.length, noOpenShift]);

  return (
    <div ref={posRootRef} className="flex h-screen bg-card">
      {/* Product side */}
      <div className="flex min-w-0 flex-1 flex-col p-4">
        {noOpenShift && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5">
            <div className="flex items-center gap-2 text-sm text-amber-900">
              <DoorOpen size={16} />
              <span>
                <span className="font-semibold">No open shift.</span> Open a shift to record sales to a cash drawer.
              </span>
            </div>
            <Link
              href="/shifts"
              prefetch={false}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600"
            >
              <DoorOpen size={14} /> Open shift
            </Link>
          </div>
        )}
        <div className="mb-3 flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <Input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearchEnter()}
              placeholder="Search parts, scan barcode, or type a plate…"
              className="pl-9 font-mono"
              autoFocus
            />
            <ScanBarcode size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" />
          </div>
          <Button variant="secondary" onClick={() => setHeldModal(true)} className="relative shrink-0" title="Held orders (F3)">
            <PauseCircle size={15} />
            <span className="hidden sm:inline">Held</span>
          </Button>
          <Button
            variant="ghost"
            onClick={toggleFullscreen}
            className="shrink-0 border border-black/10"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen (F6)" : "Fullscreen (F6)"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShortcutsOpen(true)}
            className="shrink-0 border border-black/10"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
          >
            <Keyboard size={15} />
          </Button>
        </div>

        {categoryChips.length > 0 && (
          <div className="scrollbar-hidden -mx-1 mb-2.5 flex shrink-0 gap-1.5 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Filter by category">
            <CategoryChip label="All" active={!categoryUuid} onClick={() => setCategoryUuid("")} />
            {categoryChips.map((c) => (
              <CategoryChip
                key={c.uuid}
                label={c.name}
                slug={c.slug}
                count={c.products_count}
                active={categoryUuid === c.uuid}
                onClick={() => setCategoryUuid(categoryUuid === c.uuid ? "" : c.uuid)}
              />
            ))}
          </div>
        )}

        <div className="scrollbar-hidden grid flex-1 auto-rows-min grid-cols-2 gap-2.5 overflow-y-auto pb-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {loadingProducts ? (
            <div className="col-span-full flex justify-center py-14">
              <Spinner size="md" />
            </div>
          ) : displayItems.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={<Search size={28} />}
                title="No parts found"
                hint={categoryUuid ? "Try a different search, or clear the department filter" : "Try a different search"}
              />
            </div>
          ) : (
            displayItems.map((p) => {
              const remaining = p.stock - inCartQty(p.uuid);
              const out = remaining <= 0;
              const inCart = inCartQty(p.uuid);
              // Fitment: what the counter reads off the shelf label — brand, then size.
              const fitment = [p.brand, p.size].filter(Boolean).join(" · ");
              return (
                <button
                  key={p.uuid}
                  onClick={() => addToCart(p)}
                  disabled={out}
                  className={cx(
                    "mech card group relative flex h-fit flex-col items-start gap-1.5 overflow-hidden border-l-[3px] p-3 text-left transition-all cursor-pointer",
                    out
                      ? "border-l-status-critical opacity-45"
                      : cx(
                          getCategoryBorder(p.categorySlug, p.name),
                          p.lowStock && "bg-amber-50/40",
                          "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                        )
                  )}
                >
                  {/* Quantity already on the ticket, as a lit counter in the corner. */}
                  {inCart > 0 && (
                    <span className="readout absolute right-0 top-0 rounded-bl-[0.25rem] bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                      ×{inCart}
                    </span>
                  )}

                  <div className="flex w-full items-start justify-between gap-2">
                    <CategoryIcon slug={p.categorySlug} name={p.name} />
                    {out ? <Badge tone="critical">Out</Badge> : p.lowStock ? <Badge tone="warning">Low</Badge> : null}
                  </div>

                  <span className="line-clamp-2 min-h-9 text-[13px] font-semibold leading-snug text-ink">{p.name}</span>

                  {/* Spec strip: the identifiers, set in the technical face. */}
                  <span className="line-clamp-1 h-4 w-full font-mono text-[10px] uppercase tracking-wider text-ink-muted">
                    {fitment || p.sku}
                  </span>

                  <div className="mt-0.5 flex w-full items-end justify-between border-t border-black/[0.06] pt-1.5">
                    <span className="readout text-base font-bold tracking-tight text-brand-strong">{money(p.price)}</span>
                    <span
                      className={cx(
                        "readout text-[10px] font-semibold",
                        p.lowStock ? "text-status-warning" : "text-ink-muted"
                      )}
                    >
                      {p.stock} left
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Cart side */}
      <div className="flex w-[24rem] shrink-0 flex-col border-l border-black/[0.07] bg-card 2xl:w-[26rem]">
        <div className="border-b border-black/[0.07] px-4 py-3">
          <CustomerPicker value={selectedCustomer} onChange={setSelectedCustomer} />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {cart.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center gap-2 rounded-[0.3rem] border border-dashed py-10 text-center"
              style={{ borderColor: "var(--seam)" }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-[0.25rem] border border-black/10 text-ink-muted">
                <ScanBarcode size={18} />
              </div>
              <p className="tech-label text-ink-secondary">No parts on ticket</p>
              <p className="text-xs text-ink-muted">Scan or tap a part to start</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {cart.map((item) => (
                <CartLineRow
                  key={item.productId}
                  item={item}
                  money={money}
                  onQty={(q) => setQty(item.productId, q)}
                  onRemove={() => setCart(cart.filter((i) => i.productId !== item.productId))}
                />
              ))}
            </div>
          )}
        </div>

        <div className="brushed border-t px-4 py-3" style={{ borderColor: "var(--seam)" }}>
          <div className="flex flex-col gap-1 text-sm">
            <Row label={`Subtotal (${itemCount} items)`} value={money(subtotal)} />
            <Row label={`Est. VAT (${vatRate}%)`} value={money(estimatedVat)} />
            {/* Total readout: the one figure the customer and cashier both look at. */}
            <div
              className="mt-2 flex items-baseline justify-between rounded-[0.3rem] border border-black/10 px-3 py-2"
              style={{ boxShadow: "inset 0 1px 2px var(--bevel-dark)" }}
            >
              <span className="tech-label text-ink-secondary">Est. total</span>
              <span className="readout text-2xl font-bold text-ink">{money(estimatedTotal)}</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button variant="secondary" size="lg" disabled={cart.length === 0} onClick={() => setHoldModal(true)} title="Hold sale (F4)">
              Hold
            </Button>
            <Button
              variant="ghost"
              size="lg"
              disabled={cart.length === 0}
              onClick={clearCart}
              className="border border-black/10"
              title="Clear cart (F8)"
            >
              Clear
            </Button>
            <Button
              size="lg"
              disabled={cart.length === 0 || noOpenShift}
              title={noOpenShift ? "Open a shift before charging a sale" : "Charge (F9)"}
              onClick={() => setPayModal(true)}
            >
              Charge
            </Button>
          </div>
        </div>
      </div>

      {/* text-card, not text-white: the toast inverts with the theme along with bg-ink. */}
      {flash && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink px-4 py-2 text-sm text-card shadow-lg">{flash}</div>
      )}

      <PaymentModal
        open={payModal}
        onClose={() => setPayModal(false)}
        estimatedTotal={estimatedTotal}
        money={money}
        customer={selectedCustomer}
        onComplete={async (method) => {
          try {
            const sale = await createSale({
              customer_id: customerId || undefined,
              price_tier: "retail",
              items: cart.map((i) => ({ product_id: i.productId, quantity: i.qty, unit_price: toCentavos(i.price) })),
              payments: [{ method, amount: totalCentavos }],
            });
            const receipt = await getSaleReceipt(sale.uuid);
            setPayModal(false);
            setLastReceipt(receipt);
            clearCart();
          } catch (err) {
            showFlash(err instanceof ApiError ? err.message : "Failed to complete sale");
          }
        }}
      />

      <HoldModal
        open={holdModal}
        onClose={() => setHoldModal(false)}
        onHold={async (name) => {
          try {
            await holdSale(name || `Order ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`, {
              customer_id: customerId || null,
              price_tier: "retail",
              items: cart.map((i) => ({ product_id: i.productId, quantity: i.qty, unit_price: toCentavos(i.price) })),
            });
            setHoldModal(false);
            clearCart();
          } catch (err) {
            showFlash(err instanceof ApiError ? err.message : "Failed to hold sale");
          }
        }}
      />

      <Modal open={heldModal} onClose={() => setHeldModal(false)} title="Held orders">
        {heldList.length === 0 ? (
          <EmptyState icon={<PauseCircle size={28} />} title="No held orders" />
        ) : (
          <div className="flex flex-col gap-2">
            {heldList.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-lg border border-black/[0.08] px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">{h.name}</p>
                  <p className="text-xs text-ink-muted">By {h.created_by} · expires {new Date(h.expires_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-1.5">
                  <Button size="sm" onClick={() => resumeHeld(h.id)}>
                    Resume
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => discardHeldSale(h.id).then(() => setHeldList((l) => l.filter((x) => x.id !== h.id)))}
                    aria-label="Discard"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={lastReceipt !== null}
        onClose={() => setLastReceipt(null)}
        title={`Sale complete · ${lastReceipt?.sale.sale_number ?? ""}`}
        width="max-w-md"
        footer={
          <>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={15} /> Print receipt
            </Button>
            <Button onClick={() => setLastReceipt(null)}>New sale</Button>
          </>
        }
      >
        {lastReceipt && (
          <div className="rounded-lg border border-black/[0.08] bg-[#fcfcfb] p-4">
            <ApiReceipt receipt={lastReceipt} />
          </div>
        )}
      </Modal>

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  );
}

function CategoryChip({
  label,
  slug,
  count,
  active,
  onClick,
}: {
  label: string;
  slug?: string;
  count?: number | null;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        "mech flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[0.25rem] border px-2.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] transition-colors",
        active ? getCategoryChip(slug, label) : "border-black/12 bg-card text-ink-muted hover:border-black/25 hover:text-ink"
      )}
    >
      {slug && <CategoryGlyph slug={slug} name={label} />}
      {label}
      {count != null && (
        <span className={cx("readout rounded-[0.15rem] px-1 text-[10px]", active ? "bg-black/[0.08]" : "bg-black/[0.05]")}>{count}</span>
      )}
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-ink-secondary">{label}</span>
      <span className="readout text-xs">{value}</span>
    </div>
  );
}

function CartLineRow({
  item,
  money,
  onQty,
  onRemove,
}: {
  item: CartLine;
  money: (n: number) => string;
  onQty: (q: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-[0.3rem] border border-black/[0.09] px-3 py-2" style={{ boxShadow: "inset 0 1px 0 var(--bevel-light)" }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold">{item.name}</p>
          <p className="readout text-[10px] uppercase tracking-wider text-ink-muted">
            {item.sku} · {money(item.price)} ea
          </p>
        </div>
        <button onClick={onRemove} className="rounded p-1 text-ink-muted hover:bg-black/[0.05] hover:text-status-critical cursor-pointer" aria-label={`Remove ${item.name}`}>
          <X size={13} />
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <QtyBtn onClick={() => onQty(item.qty - 1)}>
            <Minus size={13} />
          </QtyBtn>
          <input
            type="number"
            value={item.qty}
            min={0}
            onChange={(e) => onQty(parseInt(e.target.value, 10) || 0)}
            className="readout h-7 w-14 rounded-[0.25rem] border border-black/12 text-center text-sm focus:outline-2 focus:outline-brand/70"
            style={{ boxShadow: "inset 0 1px 2px var(--bevel-dark)" }}
            aria-label={`Quantity of ${item.name}`}
          />
          <QtyBtn onClick={() => onQty(item.qty + 1)}>
            <Plus size={13} />
          </QtyBtn>
        </div>
        <span className="readout text-sm font-bold">{money(item.price * item.qty)}</span>
      </div>
    </div>
  );
}

function QtyBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mech flex h-7 w-7 items-center justify-center rounded-[0.25rem] border border-black/12 text-ink-secondary transition-all hover:bg-black/[0.04] hover:text-ink active:translate-y-px cursor-pointer"
      style={{ boxShadow: "inset 0 1px 0 var(--bevel-light)" }}
    >
      {children}
    </button>
  );
}

function PaymentModal({
  open,
  onClose,
  estimatedTotal,
  money,
  customer,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  estimatedTotal: number;
  money: (n: number) => string;
  customer: Customer | null;
  onComplete: (method: SalePaymentMethod, amountPaid: number) => Promise<void>;
}) {
  const [method, setMethod] = useState<SalePaymentMethod>("cash");
  const [tendered, setTendered] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const tenderedNum = method === "cash" ? parseFloat(tendered) || 0 : estimatedTotal;
  const change = round2(tenderedNum - estimatedTotal);

  // Credit (utang) is owed by a specific customer, so it requires one to be selected.
  const creditNeedsCustomer = method === "credit" && !customer;
  // Warn (but don't block — the backend is the authority) when the sale would exceed available credit.
  const exceedsCredit = method === "credit" && !!customer && estimatedTotal > customer.available_credit;

  const canComplete = !submitting && !creditNeedsCustomer && (method !== "cash" || tenderedNum >= estimatedTotal);

  const methods: { value: SalePaymentMethod; label: string; icon: React.ReactNode }[] = [
    { value: "cash", label: "Cash", icon: <Banknote size={17} /> },
    { value: "gcash", label: "GCash", icon: <Smartphone size={17} /> },
    { value: "maya", label: "Maya", icon: <Smartphone size={17} /> },
    { value: "bank_transfer", label: "Bank", icon: <Landmark size={17} /> },
    { value: "check", label: "Check", icon: <Building2 size={17} /> },
    { value: "credit", label: "Credit", icon: <CreditCard size={17} /> },
  ];

  async function submit() {
    setSubmitting(true);
    try {
      await onComplete(method, method === "cash" ? tenderedNum : estimatedTotal);
      setTendered("");
      setMethod("cash");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Take payment"
      width="max-w-md"
      footer={
        <Button size="lg" disabled={!canComplete} className="w-full" onClick={submit}>
          {submitting ? "Completing…" : `${method === "credit" ? "Charge to account" : "Complete sale"} · ${money(estimatedTotal)}`}
        </Button>
      }
    >
      <div className="mb-4 text-center">
        <p className="text-xs text-ink-secondary">Estimated amount due</p>
        <p className="text-4xl font-bold tracking-tight">{money(estimatedTotal)}</p>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {methods.map((m) => (
          <button
            key={m.value}
            onClick={() => setMethod(m.value)}
            className={cx(
              "flex flex-col items-center gap-1 rounded-lg border py-3 text-xs font-medium transition-colors cursor-pointer",
              method === m.value ? "border-brand bg-brand-soft text-brand-strong" : "border-black/10 text-ink-secondary hover:border-black/25"
            )}
          >
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>
      {method === "cash" ? (
        <div>
          <Field label="Cash tendered">
            <Input
              type="number"
              min={0}
              step={0.01}
              autoFocus
              value={tendered}
              onChange={(e) => setTendered(e.target.value)}
              placeholder="0.00"
              className="tabular text-lg"
            />
          </Field>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => setTendered(estimatedTotal.toFixed(2))}>
              Exact
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg bg-black/[0.04] px-3 py-2.5">
            <span className="text-sm text-ink-secondary">Change due</span>
            <span className={cx("tabular text-lg font-bold", change < 0 ? "text-status-critical" : "text-brand-strong")}>{money(Math.max(change, 0))}</span>
          </div>
        </div>
      ) : method === "credit" ? (
        creditNeedsCustomer ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-center text-sm font-medium text-amber-800">
            Select a customer above to charge this sale to their account (utang).
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="rounded-lg bg-black/[0.04] px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-ink-secondary">Charge to</span>
                <span className="font-medium">{customer!.name}</span>
              </div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-ink-secondary">Available credit</span>
                <span className={cx("tabular font-medium", exceedsCredit && "text-status-critical")}>{money(customer!.available_credit)}</span>
              </div>
            </div>
            {exceedsCredit && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-800">
                This sale exceeds the customer&apos;s available credit by {money(estimatedTotal - customer!.available_credit)}.
              </p>
            )}
          </div>
        )
      ) : (
        <p className="rounded-lg bg-black/[0.04] px-3 py-2.5 text-center text-sm text-ink-secondary">
          Confirm the {method === "bank_transfer" ? "bank transfer" : method} payment, then complete the sale.
        </p>
      )}
    </Modal>
  );
}

function HoldModal({ open, onClose, onHold }: { open: boolean; onClose: () => void; onHold: (notes: string) => void }) {
  const [notes, setNotes] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Hold this sale"
      width="max-w-sm"
      footer={
        <Button
          onClick={() => {
            onHold(notes.trim());
            setNotes("");
          }}
        >
          Hold sale
        </Button>
      }
    >
      <Field label="Name (so you can find it later)">
        <Input autoFocus value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Walk-in customer, tire order" />
      </Field>
    </Modal>
  );
}

const SHORTCUTS: { keys: string; description: string }[] = [
  { keys: "F2", description: "Focus the search / barcode box" },
  { keys: "F3", description: "Open held orders" },
  { keys: "F4", description: "Hold the current sale" },
  { keys: "F6", description: "Toggle fullscreen (hides the sidebar)" },
  { keys: "F8", description: "Clear the cart" },
  { keys: "F9", description: "Charge / take payment" },
  { keys: "Esc", description: "Close the open dialog, or exit fullscreen" },
  { keys: "?", description: "Show this shortcuts list" },
];

function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts" width="max-w-sm">
      <div className="flex flex-col gap-1">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm">
            <span className="text-ink-secondary">{s.description}</span>
            <kbd className="shrink-0 rounded-md border border-black/15 bg-black/[0.04] px-2 py-1 font-mono text-xs font-semibold text-ink">
              {s.keys}
            </kbd>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-muted">Shortcuts are disabled while a dialog is open, and while typing in a text field (except F-keys).</p>
    </Modal>
  );
}

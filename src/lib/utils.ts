import { twMerge } from "tailwind-merge";

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/**
 * The shop's default currency. Every store row carries its own ISO code, so this is only
 * the fallback used before the user's store has loaded.
 */
export const DEFAULT_CURRENCY = "PHP";

/**
 * Formats an amount as currency — "₱9,000.00".
 *
 * `en-US` is deliberate: it fixes the grouping and decimal separators to the comma/period
 * convention Philippine receipts and ledgers use, while `currency` still drives the symbol.
 * Switching the locale to `en-PH` would render identically today but would let a future ICU
 * update change separators under us.
 */
export function formatMoney(n: number, currency: string = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(n);
}

/**
 * Compact form for stat tiles, where a six-figure total would otherwise wrap: "₱48.2K".
 * Below the threshold it falls back to the exact amount, because a tile reading "₱9.0K"
 * when the real figure is ₱9,000.00 reads as an approximation of something already short.
 */
export function formatMoneyCompact(n: number, currency: string = DEFAULT_CURRENCY): string {
  const big = Math.abs(n) >= 10_000;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: big ? "compact" : "standard",
    maximumFractionDigits: big ? 1 : 2,
    minimumFractionDigits: big ? 0 : 2,
  }).format(n);
}

/** Some report endpoints return decimal columns as numeric strings (e.g. "386.0000") despite the declared `number` type. */
export function toNum(v: number | string): number {
  return typeof v === "string" ? parseFloat(v) : v;
}

/**
 * Formats a stock/quantity value for display, stripping the backend's fixed 4-decimal
 * padding: "3.0000" -> "3", "2.5000" -> "2.5". Keeps up to `maxDecimals` significant
 * fractional digits and adds thousands separators. Accepts the numeric-string form.
 */
export function formatQty(v: number | string | null | undefined, maxDecimals = 4): string {
  if (v === null || v === undefined || v === "") return "0";
  const n = toNum(v);
  if (Number.isNaN(n)) return "0";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: maxDecimals }).format(n);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function cx(...classes: (string | false | null | undefined)[]): string {
  return twMerge(classes.filter(Boolean).join(" "));
}

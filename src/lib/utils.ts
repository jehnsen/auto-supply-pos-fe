import { twMerge } from "tailwind-merge";

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
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

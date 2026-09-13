"use client";

import { useEffect, useRef, useState } from "react";
import { Search, UserRound, X } from "lucide-react";
import { listCustomers, type Customer } from "@/lib/api/customers";
import { cx } from "@/lib/utils";

/** Searchable customer combobox for the POS cart panel — scales to large customer bases via server-side search instead of a fully-loaded dropdown. */
export function CustomerPicker({
  value,
  onChange,
}: {
  value: Customer | null;
  onChange: (customer: Customer | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function run() {
      setLoading(true);
      try {
        const res = await listCustomers({ q: debouncedQuery || undefined, per_page: 20, is_active: true });
        if (!cancelled) setResults(res.items);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [open, debouncedQuery]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openPicker() {
    setOpen(true);
    setQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function pick(customer: Customer | null) {
    onChange(customer);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPicker())}
        className="flex h-8 w-full items-center gap-1.5 rounded-lg border border-black/10 bg-card px-2.5 text-xs cursor-pointer"
      >
        <UserRound size={13} className="shrink-0 text-ink-muted" />
        <span className="min-w-0 flex-1 truncate text-left">{value ? value.name : "Walk-in customer"}</span>
        {value && (
          <span
            role="button"
            aria-label="Clear selected customer"
            onClick={(e) => {
              e.stopPropagation();
              pick(null);
            }}
            className="shrink-0 rounded p-0.5 text-ink-muted hover:bg-black/[0.06] hover:text-ink"
          >
            <X size={12} />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-80 rounded-[0.3rem] border border-black/10 bg-card shadow-[0_12px_32px_-8px_rgba(11,11,11,0.25)]">
          <div className="relative p-1.5">
            <Search size={13} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && results.length > 0) pick(results[0]);
              }}
              placeholder="Search by name, code, or phone…"
              className="h-8 w-full rounded-lg border border-black/10 pl-7 pr-2 text-xs outline-none focus:border-brand"
            />
          </div>
          <div className="max-h-64 overflow-y-auto border-t border-black/[0.06] py-1">
            <button
              onClick={() => pick(null)}
              className={cx(
                "flex w-full items-center px-3 py-2 text-left text-xs hover:bg-black/[0.03] cursor-pointer",
                !value && "bg-brand-soft font-medium text-brand-strong"
              )}
            >
              Walk-in customer
            </button>
            {loading ? (
              <p className="px-3 py-3 text-center text-xs text-ink-muted">Searching…</p>
            ) : results.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-ink-muted">
                {debouncedQuery ? "No customers match" : "No customers found"}
              </p>
            ) : (
              results.map((c) => (
                <button
                  key={c.uuid}
                  onClick={() => pick(c)}
                  className={cx(
                    "flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-black/[0.03] cursor-pointer",
                    value?.uuid === c.uuid && "bg-brand-soft"
                  )}
                >
                  <span className="text-xs font-medium">{c.name}</span>
                  <span className="text-[11px] text-ink-muted">
                    {c.code}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

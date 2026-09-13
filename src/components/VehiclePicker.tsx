"use client";

import { useEffect, useRef, useState } from "react";
import { Car, Plus, Search, X } from "lucide-react";
import { describeVehicle, listVehicles, type Vehicle } from "@/lib/api/vehicles";
import { cx } from "@/lib/utils";

/**
 * Vehicle combobox, scoped to one customer.
 *
 * Unlike `CustomerPicker` this filters client-side: a customer has a handful of vehicles,
 * not thousands, so a round trip per keystroke would be wasted work.
 */
export function VehiclePicker({
  customerUuid,
  value,
  onChange,
  onAddNew,
}: {
  /** Null before a customer is chosen — the picker disables itself. */
  customerUuid: string | null;
  value: Vehicle | null;
  onChange: (vehicle: Vehicle | null) => void;
  /** Shown as an "Add vehicle" affordance inside the dropdown when provided. */
  onAddNew?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Loads on open. setState lands in the promise callback, never synchronously in the
  // effect body, so this stays a legitimate "subscribe to an external store" effect.
  useEffect(() => {
    if (!open || !customerUuid) return;
    let cancelled = false;
    listVehicles(customerUuid)
      .then((rows) => {
        if (!cancelled) {
          setVehicles(rows);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVehicles([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, customerUuid]);

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

  const q = query.trim().toLowerCase();
  const filtered = q
    ? vehicles.filter((v) => [v.plate, v.make, v.model].some((f) => f?.toLowerCase().includes(q)))
    : vehicles;

  function pick(vehicle: Vehicle | null) {
    onChange(vehicle);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        type="button"
        disabled={!customerUuid}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          setOpen(true);
          setQuery("");
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className={cx(
          "flex h-9.5 w-full items-center gap-1.5 rounded-lg border border-black/10 bg-card px-2.5 text-sm",
          customerUuid ? "cursor-pointer" : "cursor-not-allowed opacity-50"
        )}
      >
        <Car size={14} className="shrink-0 text-ink-muted" />
        <span className="min-w-0 flex-1 truncate text-left">
          {value ? describeVehicle(value) : customerUuid ? "Select a vehicle…" : "Choose a customer first"}
        </span>
        {value && (
          <span
            role="button"
            aria-label="Clear selected vehicle"
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
        <div className="absolute left-0 top-full z-30 mt-1 w-full min-w-72 rounded-[0.3rem] border border-black/10 bg-card shadow-[0_12px_32px_-8px_rgba(11,11,11,0.25)]">
          <div className="relative p-1.5">
            <Search size={13} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered.length > 0) pick(filtered[0]);
              }}
              placeholder="Search plate, make or model…"
              className="h-8 w-full rounded-lg border border-black/10 pl-7 pr-2 text-xs outline-none focus:border-brand"
            />
          </div>
          <div className="max-h-64 overflow-y-auto border-t border-black/[0.06] py-1">
            {loading ? (
              <p className="px-3 py-3 text-center text-xs text-ink-muted">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-ink-muted">
                {vehicles.length === 0 ? "No vehicles on file yet" : "No vehicles match"}
              </p>
            ) : (
              filtered.map((v) => (
                <button
                  key={v.uuid}
                  onClick={() => pick(v)}
                  className={cx(
                    "flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-black/[0.03] cursor-pointer",
                    value?.uuid === v.uuid && "bg-brand-soft"
                  )}
                >
                  <span className="font-mono text-xs font-semibold">{v.plate}</span>
                  <span className="text-[11px] text-ink-muted">
                    {[v.year, v.make, v.model].filter(Boolean).join(" ")}
                    {v.color ? ` · ${v.color}` : ""}
                  </span>
                </button>
              ))
            )}
          </div>
          {onAddNew && (
            <button
              onClick={() => {
                setOpen(false);
                onAddNew();
              }}
              className="flex w-full items-center gap-1.5 border-t border-black/[0.06] px-3 py-2 text-left text-xs font-medium text-brand-strong hover:bg-black/[0.03] cursor-pointer"
            >
              <Plus size={13} /> Add a vehicle
            </button>
          )}
        </div>
      )}
    </div>
  );
}

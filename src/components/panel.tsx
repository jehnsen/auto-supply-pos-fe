"use client";

import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

/**
 * An instrument plate: the shared chrome for every working surface in the app.
 *
 * The corner marks are machined fasteners rather than decoration — they fix the plate to
 * the panel behind it, and they make a block's extent legible without a heavy border. The
 * header sits on its own seam so a plate reads as two milled pieces joined, not one box.
 */
export function Panel({
  label,
  step,
  actions,
  children,
  className,
  bodyClassName,
  /** Tints the header strip. On by default; off for plates that should read as one surface. */
  brushedHeader = true,
}: {
  /** Uppercase caption, e.g. "CUSTOMER". */
  label?: string;
  /** Optional leading number for sequenced sections ("1", "2", …). */
  step?: number | string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  brushedHeader?: boolean;
}) {
  const hasHeader = !!(label || actions);
  return (
    <section className={cx("card ticked relative", className)}>
      {hasHeader && (
        <div
          className={cx("flex items-center justify-between gap-3 border-b px-4 py-2.5", brushedHeader && "brushed")}
          style={{ borderColor: "var(--seam)" }}
        >
          {label && (
            <h2 className="tech-label flex items-center gap-2 text-ink-secondary">
              {/*
                Item number, as on a parts callout. Squared and mono so it reads as an
                index into the drawing rather than decoration.
              */}
              {step !== undefined ? (
                <span className="border border-brand/40 bg-brand-soft px-1 text-[9px] font-bold text-brand-strong">
                  {String(step).padStart(2, "0")}
                </span>
              ) : (
                <span aria-hidden className="h-2 w-0.5 bg-brand" />
              )}
              {label}
            </h2>
          )}
          {actions}
        </div>
      )}
      <div className={cx("px-4 py-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Small technical caption used for sub-groups inside a plate. */
export function Caption({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("tech-label text-ink-muted", className)}>{children}</p>;
}

/**
 * A removable token. Square, hairline-bordered, with a leading rule when selected — a
 * stamped tag rather than a pill. Used for condition notes, turnover items and problem tags.
 */
export function Chip({
  children,
  onRemove,
  selected,
  onClick,
}: {
  children: ReactNode;
  onRemove?: () => void;
  selected?: boolean;
  onClick?: () => void;
}) {
  const interactive = !!onClick;
  return (
    <span
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => (e.key === "Enter" || e.key === " ") && onClick?.() : undefined}
      className={cx(
        "mech inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs transition-colors",
        interactive && "cursor-pointer",
        selected
          ? "border-l-[3px] border-brand/50 border-l-brand bg-brand-soft font-medium text-brand-strong"
          : "border-black/12 bg-black/[0.02] text-ink-secondary hover:border-black/25 hover:text-ink"
      )}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="-mr-0.5 text-ink-muted hover:text-status-critical cursor-pointer"
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
}

/**
 * Label/value row for readouts. Values are set in the mono readout face and joined to
 * their label by a dotted leader, the way a spec sheet lines up figures.
 */
export function DataRow({
  label,
  value,
  strong,
  critical,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
  critical?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-2 py-1.5">
      <span className={cx("shrink-0 text-sm", strong ? "font-semibold text-ink" : "text-ink-secondary")}>{label}</span>
      <span
        aria-hidden
        className="h-px min-w-4 flex-1 self-center"
        style={{
          backgroundImage: "radial-gradient(circle, var(--ink-muted) 0.5px, transparent 0.5px)",
          backgroundSize: "4px 1px",
          opacity: 0.45,
        }}
      />
      <span
        className={cx(
          "readout shrink-0 text-sm",
          strong && "font-semibold",
          critical ? "text-status-critical" : "text-ink"
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * A lit indicator, for states the shop actually watches: a bay running, a shift open, a
 * job past its promise. `tone` maps to the status palette, never to brand.
 */
export function Lamp({ tone = "neutral", className }: { tone?: "neutral" | "good" | "warning" | "critical"; className?: string }) {
  const colors = {
    neutral: "text-ink-muted",
    good: "text-status-good",
    warning: "text-status-warning",
    critical: "text-status-critical",
  };
  return <span aria-hidden className={cx("lamp inline-block h-1.5 w-1.5 bg-current", colors[tone], className)} />;
}

"use client";

import type { ReactNode } from "react";

/**
 * Header for the three counter screens (intake, board, release). The "COUNTER" eyebrow
 * marks these as front-desk workflows rather than back-office management pages.
 */
export function CounterHeader({
  title,
  subtitle,
  actions,
  aside,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Right-aligned secondary content, e.g. today's date. */
  aside?: ReactNode;
}) {
  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="tech-label flex items-center gap-1.5 text-ink-muted">
            {/* Station marker: this screen is a post on the shop floor. */}
            <span aria-hidden className="inline-block h-1 w-4 bg-brand" />
            Counter
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-secondary">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
          {aside && <span className="readout text-xs text-ink-muted">{aside}</span>}
        </div>
      </div>
      {/* Seam closing the header block off from the work area below it. */}
      <div className="mt-4 h-px w-full" style={{ background: "var(--seam)" }} />
    </div>
  );
}

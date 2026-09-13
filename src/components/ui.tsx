"use client";

import { AlertTriangle, HelpCircle, X } from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";
import { cx } from "@/lib/utils";

/* ---------- Button ---------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

/**
 * Controls are machined switches: a top bevel catches light, a bottom one falls into
 * shadow, and pressing one physically depresses it (translate + flattened bevel) instead
 * of merely changing colour.
 */
const buttonVariants: Record<ButtonVariant, string> = {
  // Solid-surface variants use -bg/-hover tokens rather than -strong / red-700, which invert to
  // light values in dark mode and would leave white label text unreadable.
  primary:
    "bg-brand text-white hover:bg-brand-hover shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.2),0_1px_2px_var(--card-shadow)]",
  secondary:
    "bg-card text-ink border border-black/12 hover:bg-black/[0.03] shadow-[inset_0_1px_0_var(--bevel-light),inset_0_-1px_0_var(--bevel-dark)]",
  ghost: "text-ink-secondary hover:bg-black/[0.05] hover:text-ink",
  danger:
    "bg-critical-bg text-white hover:bg-critical-bg-hover shadow-[inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.2),0_1px_2px_var(--card-shadow)]",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9.5 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      className={cx(
        "mech inline-flex items-center justify-center font-medium transition-all cursor-pointer",
        // The press: the control travels 1px and its top bevel flattens, like a real switch.
        "active:translate-y-px active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.2)]",
        "disabled:opacity-45 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    />
  );
}

/* ---------- Form controls ---------- */

/**
 * Inputs are recessed: the inner shadow at the top edge makes the field read as a slot cut
 * into the plate, the inverse of the raised buttons above.
 */
const fieldBase =
  "w-full border border-black/12 bg-card px-3 text-sm text-ink placeholder:text-ink-muted " +
  "shadow-[inset_0_1px_2px_var(--bevel-dark)] " +
  "focus:outline-2 focus:outline-offset-0 focus:outline-brand/70 disabled:opacity-50";

export function Input({
  className,
  ref,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { ref?: React.Ref<HTMLInputElement> }) {
  const isDateLike = props.type === "date" || props.type === "time" || props.type === "datetime-local";
  return <input ref={ref} className={cx(fieldBase, "h-9.5", isDateLike && "cursor-pointer", className)} {...props} />;
}

export function Select({ className, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(fieldBase, "h-9.5 cursor-pointer", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(fieldBase, "py-2 min-h-20", className)} {...props} />;
}

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="tech-label mb-1.5 block text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

/* ---------- Badge ---------- */

type BadgeTone = "neutral" | "good" | "warning" | "critical" | "brand";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-black/[0.06] text-ink-secondary border-black/10",
  good: "bg-emerald-50 text-emerald-800 border-emerald-600/25",
  warning: "bg-amber-50 text-amber-800 border-amber-600/25",
  critical: "bg-red-50 text-red-800 border-red-600/25",
  brand: "bg-brand-soft text-brand-strong border-brand/25",
};

/**
 * Status plate rather than a pill: squared off, hairline-bordered, mono. It reads as a
 * stamped legend on equipment, and squared corners sit better beside the machined controls.
 */
export function Badge({ tone = "neutral", className, children }: { tone?: BadgeTone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap",
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ---------- Modal ---------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    // Lock page scroll while a dialog is up
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Move focus into the dialog unless a child (e.g. an autoFocus input) already claimed it
    const id = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (panel && !panel.contains(document.activeElement)) panel.focus();
    });
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      cancelAnimationFrame(id);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Literal black: dark mode remaps `black` to white for hairlines, but a scrim must stay dark. */}
      <div
        className="absolute inset-0 bg-[#000]/45 backdrop-blur-[3px] animate-[dialog-overlay-in_150ms_ease-out]"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cx(
          "ticked relative flex max-h-[90vh] w-full flex-col border border-black/[0.12] bg-card",
          "shadow-[inset_0_1px_0_var(--bevel-light),0_24px_60px_-12px_rgba(0,0,0,0.45)] outline-none",
          "animate-[dialog-panel-in_180ms_cubic-bezier(0.2,0.8,0.2,1)]",
          width
        )}
      >
        <div className="brushed flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "var(--seam)" }}>
          <h2 className="tech-label text-ink-secondary">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-ink-muted transition-colors hover:bg-black/[0.05] hover:text-ink cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-black/[0.07] px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Page header ---------- */

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-secondary">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Spinner ---------- */

const spinnerSizes = { sm: "h-5 w-5", md: "h-6 w-6", lg: "h-7 w-7" };

export function Spinner({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  return <div role="status" aria-label="Loading" className={cx("spinner", spinnerSizes[size], className)} />;
}

/* ---------- Empty state ---------- */

export function EmptyState({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-14 text-center">
      <div className="mb-1 text-ink-muted opacity-70">{icon}</div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {hint && <p className="max-w-xs text-xs leading-relaxed text-ink-muted">{hint}</p>}
    </div>
  );
}

/* ---------- Table ---------- */

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="w-full text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className, right }: { children?: ReactNode; className?: string; right?: boolean }) {
  return (
    <th
      className={cx(
        "tech-label border-b px-3 py-2.5 text-ink-muted",
        right ? "text-right" : "text-left",
        className
      )}
      style={{ borderColor: "var(--seam)" }}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, right }: { children?: ReactNode; className?: string; right?: boolean }) {
  return (
    <td
      className={cx(
        "border-b border-black/[0.05] px-3 py-2.5 align-middle",
        right ? "text-right tabular" : "text-left",
        className
      )}
    >
      {children}
    </td>
  );
}

/* ---------- Segmented control ---------- */

/** A mode selector, styled as a bank of console switches. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="inline-flex border border-black/12 bg-card p-0.5"
      style={{ boxShadow: "inset 0 1px 2px var(--bevel-dark)" }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "mech px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] transition-all cursor-pointer",
            o.value === value
              ? "bg-brand text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
              : "text-ink-muted hover:text-ink"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Confirm ---------- */

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  tone = "danger",
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="max-w-sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        <span
          className={cx(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            tone === "danger" ? "bg-red-50 text-status-critical" : "bg-brand-soft text-brand-strong"
          )}
        >
          {tone === "danger" ? <AlertTriangle size={17} /> : <HelpCircle size={17} />}
        </span>
        <p className="pt-1 text-sm leading-relaxed text-ink-secondary">{message}</p>
      </div>
    </Modal>
  );
}

/**
 * Styled replacement for window.prompt: asks for a short text value
 * (e.g. a void/cancel reason) before running an action.
 */
export function PromptDialog({
  open,
  onClose,
  onSubmit,
  title,
  message,
  label,
  placeholder,
  confirmLabel = "Confirm",
  tone = "default",
  multiline = false,
  required = true,
  busy = false,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  message?: string;
  label: string;
  placeholder?: string;
  confirmLabel?: string;
  tone?: "danger" | "default";
  multiline?: boolean;
  required?: boolean;
  busy?: boolean;
  error?: string | null;
}) {
  const [value, setValue] = useState("");

  useEffect(() => {
    if (open) setValue("");
  }, [open]);

  const trimmed = value.trim();
  const canSubmit = (!required || trimmed.length > 0) && !busy;
  const submit = () => canSubmit && onSubmit(trimmed);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width="max-w-sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={tone === "danger" ? "danger" : "primary"} disabled={!canSubmit} onClick={submit}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {message && (
          <div className="flex items-start gap-3">
            <span
              className={cx(
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                tone === "danger" ? "bg-red-50 text-status-critical" : "bg-brand-soft text-brand-strong"
              )}
            >
              {tone === "danger" ? <AlertTriangle size={17} /> : <HelpCircle size={17} />}
            </span>
            <p className="pt-1 text-sm leading-relaxed text-ink-secondary">{message}</p>
          </div>
        )}
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
        <Field label={label}>
          {multiline ? (
            <Textarea autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="min-h-20" />
          ) : (
            <Input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          )}
        </Field>
      </div>
    </Modal>
  );
}

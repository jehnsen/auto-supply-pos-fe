"use client";

import { useState } from "react";
import { adjustCreditLimit, type Customer } from "@/lib/api/customers";
import { ApiError } from "@/lib/api/client";
import { Button, Field, Input, Modal, Textarea } from "@/components/ui";

export function AdjustCreditLimitModal({
  customer,
  money,
  onClose,
  onSaved,
}: {
  customer: Customer;
  money: (n: number) => string;
  onClose: () => void;
  onSaved: (updated: Customer) => void;
}) {
  const [creditLimit, setCreditLimit] = useState(customer.credit_limit.toString());
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newLimit = parseFloat(creditLimit);
  const valid = creditLimit.trim() !== "" && !Number.isNaN(newLimit) && newLimit >= 0 && reason.trim().length > 0 && newLimit !== customer.credit_limit;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const updated = await adjustCreditLimit(customer.uuid, newLimit, reason.trim());
      onSaved(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to adjust credit limit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Adjust credit limit · ${customer.name}`}
      width="max-w-sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={!valid || saving} onClick={submit}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-lg bg-black/[0.04] px-3 py-2 text-sm">
          <span className="text-ink-secondary">Current limit</span>
          <span className="font-semibold">{money(customer.credit_limit)}</span>
        </div>
        <Field label="New credit limit">
          <Input type="number" min={0} step={0.01} autoFocus value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
        </Field>
        <Field label="Reason">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Good payment history, increased order volume…"
            className="min-h-16"
          />
        </Field>
      </div>
    </Modal>
  );
}

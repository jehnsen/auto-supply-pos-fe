"use client";

import { useState } from "react";
import { recordCustomerPayment, type Customer, type RecordPaymentResult } from "@/lib/api/customers";
import { ApiError } from "@/lib/api/client";
import { Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";

export function RecordPaymentModal({
  customer,
  money,
  onClose,
  onSaved,
}: {
  customer: Customer;
  money: (n: number) => string;
  onClose: () => void;
  onSaved: (result: RecordPaymentResult) => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = parseFloat(amount);
  const valid = amount.trim() !== "" && !Number.isNaN(parsedAmount) && parsedAmount > 0;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const result = await recordCustomerPayment(customer.uuid, {
        amount: parsedAmount,
        payment_method: method,
        reference_number: reference.trim() || undefined,
        payment_date: paymentDate || undefined,
        notes: notes.trim() || undefined,
      });
      onSaved(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={`Record payment · ${customer.name}`}
      width="max-w-sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button disabled={!valid || saving} onClick={submit}>
            {saving ? "Recording…" : "Record payment"}
          </Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-status-critical">{error}</p>}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-lg bg-black/[0.04] px-3 py-2 text-sm">
          <span className="text-ink-secondary">Outstanding balance</span>
          <span className="font-semibold">{money(customer.total_outstanding)}</span>
        </div>
        <Field label="Amount">
          <Input type="number" min={0} step={0.01} autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Method">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="gcash">GCash</option>
            <option value="maya">Maya</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="check">Check</option>
          </Select>
        </Field>
        <Field label="Reference (optional)">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="OR / reference number" />
        </Field>
        <Field label="Payment date">
          <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
        </Field>
        <Field label="Notes (optional)">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Payment via GCash" className="min-h-16" />
        </Field>
      </div>
    </Modal>
  );
}

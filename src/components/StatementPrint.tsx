"use client";

import type { CustomerStatement } from "@/lib/api/customers";
import type { StoreProfile } from "@/lib/api/settings";
import { formatDate } from "@/lib/utils";

export default function StatementPrint({
  statement,
  store,
  money,
}: {
  statement: CustomerStatement;
  store: StoreProfile["store"] | null;
  money: (n: number) => string;
}) {
  const c = statement.customer;

  return (
    <div id="statement-print" className="hidden bg-white p-8 text-black print:block">
      <div className="mb-6 flex items-start justify-between border-b border-black/20 pb-4">
        <div>
          <p className="text-lg font-bold tracking-wide">{store?.name?.toUpperCase() ?? ""}</p>
          {store?.address && <p className="text-xs">{store.address}</p>}
          <p className="text-xs">{[store?.city, store?.province, store?.postal_code].filter(Boolean).join(", ")}</p>
          {store?.phone && <p className="text-xs">Tel: {store.phone}</p>}
          {store?.tin && <p className="text-xs">TIN: {store.tin}</p>}
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">Statement of Account</p>
          <p className="text-xs">
            {formatDate(statement.period.from)} – {formatDate(statement.period.to)}
          </p>
          <p className="mt-1 text-[10px] text-black/60">Printed {formatDate(new Date().toISOString())}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-6 text-xs">
        <div>
          <p className="mb-1 font-semibold uppercase tracking-wide text-black/60">Bill to</p>
          <p className="font-semibold">{c.name}</p>
          <p>{c.code}</p>
          {c.address && <p>{c.address}</p>}
          {c.phone && <p>Tel: {c.phone}</p>}
          {c.email && <p>{c.email}</p>}
        </div>
        <div className="text-right">
          <p className="mb-1 font-semibold uppercase tracking-wide text-black/60">Account</p>
          <p>Credit limit: {money(c.credit_limit)}</p>
          <p>Credit terms: {c.credit_terms_days} days</p>
        </div>
      </div>

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-y border-black/30">
            <th className="py-1.5 text-left font-semibold">Date</th>
            <th className="py-1.5 text-left font-semibold">Description</th>
            <th className="py-1.5 text-left font-semibold">Reference</th>
            <th className="py-1.5 text-right font-semibold">Charges</th>
            <th className="py-1.5 text-right font-semibold">Payments</th>
            <th className="py-1.5 text-right font-semibold">Balance</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-black/10">
            <td className="py-1.5" colSpan={5}>
              Opening balance
            </td>
            <td className="py-1.5 text-right font-medium">{money(statement.opening_balance)}</td>
          </tr>
          {statement.transactions.map((t, i) => (
            <tr key={i} className="border-b border-black/10">
              <td className="py-1.5 whitespace-nowrap">{formatDate(t.date)}</td>
              <td className="py-1.5">
                {t.description}
                {t.sale_number && <span className="text-black/50"> · {t.sale_number}</span>}
              </td>
              <td className="py-1.5">{t.reference || "—"}</td>
              <td className="py-1.5 text-right">{t.charges ? money(t.charges) : ""}</td>
              <td className="py-1.5 text-right">{t.payments ? money(t.payments) : ""}</td>
              <td className="py-1.5 text-right">{money(t.balance)}</td>
            </tr>
          ))}
          <tr className="border-t-2 border-black/40">
            <td className="py-1.5 font-semibold" colSpan={5}>
              Closing balance
            </td>
            <td className="py-1.5 text-right font-bold">{money(statement.closing_balance)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-56 text-xs">
          <div className="flex justify-between py-0.5">
            <span>Total charges</span>
            <span>{money(statement.summary.total_charges)}</span>
          </div>
          <div className="flex justify-between py-0.5">
            <span>Total payments</span>
            <span>{money(statement.summary.total_payments)}</span>
          </div>
          <div className="flex justify-between border-t border-black/30 py-0.5 font-semibold">
            <span>Net change</span>
            <span>{money(statement.summary.net_change)}</span>
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-[10px] text-black/50">This is a system-generated statement of account.</p>
    </div>
  );
}

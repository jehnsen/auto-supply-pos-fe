"use client";

import type { SaleReceipt } from "@/lib/api/sales";

export default function ApiReceipt({ receipt }: { receipt: SaleReceipt }) {
  return (
    <div id="receipt-print" className="mx-auto w-full max-w-[300px] bg-white font-mono text-[11.5px] leading-relaxed text-[#000]">
      <div className="text-center">
        <p className="text-sm font-bold tracking-wide">{receipt.store.name.toUpperCase()}</p>
        <p>{receipt.store.address}</p>
        <p>{receipt.store.phone}</p>
        {receipt.store.tin && <p>TIN: {receipt.store.tin}</p>}
      </div>
      <div className="my-2 border-t border-dashed border-[#000]/60" />
      <div className="flex justify-between">
        <span>{receipt.sale.sale_number}</span>
        <span>{receipt.sale.date}</span>
      </div>
      <p>Cashier: {receipt.sale.cashier}</p>
      <p>Branch: {receipt.sale.branch}</p>
      {receipt.customer && <p>Customer: {receipt.customer.name}</p>}
      {receipt.is_reprint && <p className="font-bold">*** REPRINT ***</p>}
      <div className="my-2 border-t border-dashed border-[#000]/60" />
      {receipt.items.map((item, i) => (
        <div key={i} className="mb-1">
          <p>{item.name}</p>
          <div className="flex justify-between">
            <span className="pl-2">
              {item.quantity} {item.unit_of_measure} × {item.unit_price}
            </span>
            <span>{item.line_total}</span>
          </div>
          {item.discount && (
            <div className="flex justify-between pl-2">
              <span>Discount</span>
              <span>-{item.discount}</span>
            </div>
          )}
        </div>
      ))}
      <div className="my-2 border-t border-dashed border-[#000]/60" />
      <div className="flex justify-between">
        <span>Subtotal</span>
        <span>{receipt.totals.subtotal}</span>
      </div>
      {receipt.totals.discount && (
        <div className="flex justify-between">
          <span>Discount</span>
          <span>-{receipt.totals.discount}</span>
        </div>
      )}
      <div className="flex justify-between">
        <span>
          VAT ({receipt.totals.vat_rate}, {receipt.totals.vat_type})
        </span>
        <span>{receipt.totals.vat_amount}</span>
      </div>
      <div className="flex justify-between text-sm font-bold">
        <span>TOTAL</span>
        <span>{receipt.totals.total}</span>
      </div>
      <div className="my-2 border-t border-dashed border-[#000]/60" />
      {receipt.payments.map((p, i) => (
        <div key={i} className="flex justify-between">
          <span>{p.method}</span>
          <span>{p.amount}</span>
        </div>
      ))}
      {receipt.change && (
        <div className="flex justify-between">
          <span>Change</span>
          <span>{receipt.change}</span>
        </div>
      )}
      <div className="my-2 border-t border-dashed border-[#000]/60" />
      <p className="text-center">{receipt.footer.message}</p>
      <p className="text-center text-[10px]">{receipt.footer.terms}</p>
    </div>
  );
}

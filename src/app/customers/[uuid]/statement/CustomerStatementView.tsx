"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, ArrowLeft, Download, FileText, Printer } from "lucide-react";
import { getCustomerStatement, type CustomerStatement } from "@/lib/api/customers";
import { getStoreProfile, type StoreProfile } from "@/lib/api/settings";
import { ApiError } from "@/lib/api/client";
import { useAuthStore } from "@/lib/auth-store";
import { downloadCSV, formatDate } from "@/lib/utils";
import { Button, EmptyState, Field, Input, PageHeader, Spinner, Table, Td, Th } from "@/components/ui";
import StatementPrint from "@/components/StatementPrint";

export default function CustomerStatementView() {
  const params = useParams<{ uuid: string }>();
  const router = useRouter();
  const currency = useAuthStore((s) => s.user?.store.currency) ?? "PHP";
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(n);

  const [from, setFrom] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [store, setStore] = useState<StoreProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const [s, p] = await Promise.all([getCustomerStatement(params.uuid, from, to), store ? Promise.resolve(store) : getStoreProfile()]);
        if (cancelled) return;
        setStatement(s);
        setStore(p);
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load statement");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.uuid, from, to]);

  function downloadStatementCSV() {
    if (!statement) return;
    downloadCSV(
      `statement-${statement.customer.code}.csv`,
      ["Date", "Type", "Description", "Reference", "Charges", "Payments", "Balance"],
      statement.transactions.map((t) => [t.date, t.type, t.description, t.reference, t.charges, t.payments, t.balance])
    );
  }

  return (
    <div className="p-6">
      <button
        onClick={() => router.push(`/customers/${params.uuid}`)}
        className="mb-3 flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink cursor-pointer print:hidden"
      >
        <ArrowLeft size={14} /> Back to customer
      </button>

      <div className="print:hidden">
        <PageHeader
          title={`Statement of account${statement ? ` · ${statement.customer.name}` : ""}`}
          actions={
            <>
              <Button variant="secondary" onClick={downloadStatementCSV} disabled={!statement}>
                <Download size={15} /> CSV
              </Button>
              <Button onClick={() => window.print()} disabled={!statement}>
                <Printer size={15} /> Print
              </Button>
            </>
          }
        />

        <div className="mb-4 flex items-end gap-3">
          <Field label="From">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
        </div>

        {loading ? (
          <div className="flex justify-center py-14">
            <Spinner size="md" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <AlertTriangle size={24} className="text-status-critical" />
            <p className="text-sm font-medium text-status-critical">{error}</p>
          </div>
        ) : statement ? (
          <div className="card">
            <div className="grid grid-cols-3 gap-2 border-b border-black/[0.07] p-4 text-center">
              <MiniStat label="Opening balance" value={money(statement.opening_balance)} />
              <MiniStat label="Net change" value={money(statement.summary.net_change)} />
              <MiniStat label="Closing balance" value={money(statement.closing_balance)} />
            </div>
            <Table>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Description</Th>
                  <Th>Reference</Th>
                  <Th right>Charges</Th>
                  <Th right>Payments</Th>
                  <Th right>Balance</Th>
                </tr>
              </thead>
              <tbody>
                {statement.transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState icon={<FileText size={24} />} title="No activity in this period" />
                    </td>
                  </tr>
                ) : (
                  statement.transactions.map((t, i) => (
                    <tr key={i}>
                      <Td className="whitespace-nowrap text-ink-secondary">{formatDate(t.date)}</Td>
                      <Td>{t.description}</Td>
                      <Td className="font-mono text-xs">{t.reference || "—"}</Td>
                      <Td right>{t.charges ? money(t.charges) : "—"}</Td>
                      <Td right>{t.payments ? money(t.payments) : "—"}</Td>
                      <Td right className="font-medium">
                        {money(t.balance)}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        ) : null}
      </div>

      {/* Print-only full-page statement. Global print CSS reveals only #statement-print. */}
      {statement && <StatementPrint statement={statement} store={store?.store ?? null} money={money} />}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, FileText, HandCoins, Wallet } from 'lucide-react';

import { Table, TableHeader, TableWrapper, Tbody, Td, Th, Thead } from '@/components/DataTable';
import { useInvoicesApi } from '@/hooks/useInvoicesApi';
import { useLedgerApi } from '@/hooks/useLedgerApi';
import { getApiErrorMessage } from '@/lib/api/authClient';

const money = (value) => `Ksh ${Number(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function StatusBadge({ status }) {
  const tones = {
    issued: 'border-blue-200 bg-blue-50 text-blue-700',
    partial: 'border-amber-200 bg-amber-50 text-amber-700',
    paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    cancelled: 'border-red-200 bg-red-50 text-red-700',
  };

  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${tones[status] ?? 'border-slate-200 bg-slate-50 text-slate-600'}`}>{status}</span>;
}

export function StudentFeeStatementPage() {
  const invoicesApi = useInvoicesApi();
  const ledgerApi = useLedgerApi();
  const [invoices, setInvoices] = useState([]);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    Promise.all([invoicesApi.myInvoices(), invoicesApi.myFinanceSummary(), ledgerApi.myLedger()])
      .then(([invoiceResponse, summaryResponse, ledgerResponse]) => {
        if (!mounted) return;
        setInvoices(invoiceResponse.data ?? []);
        setSummary(summaryResponse);
        setEntries(ledgerResponse.data ?? []);
      })
      .catch((requestError) => {
        if (mounted) setError(getApiErrorMessage(requestError, 'Failed to load your fee statement.'));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [invoicesApi, ledgerApi]);

  const totals = useMemo(() => ({
    outstanding: summary?.outstanding_balance ?? 0,
    paid: summary?.total_paid ?? 0,
    adjustments: summary?.total_adjustments ?? 0,
    credit: summary?.unallocated_credit ?? 0,
  }), [summary]);

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-10 text-sm text-slate-500">Loading fee statement...</div>;
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-950">Fee Statement</h1>
        <p className="mt-1 text-sm text-slate-500">Invoices are generated when you register for an academic session.</p>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Outstanding', value: totals.outstanding, icon: Wallet, tone: 'bg-red-50 text-red-600' },
          { label: 'Total Paid', value: totals.paid, icon: HandCoins, tone: 'bg-emerald-50 text-emerald-600' },
          { label: 'Available Credit', value: totals.credit, icon: Wallet, tone: 'bg-sky-50 text-sky-600' },
          { label: 'Net Adjustments', value: totals.adjustments, icon: FileText, tone: 'bg-amber-50 text-amber-600' },
        ].map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`inline-flex rounded-xl p-2.5 ${tone}`}><Icon className="size-5" /></div>
            <p className="mt-4 text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{money(value)}</p>
          </div>
        ))}
      </div>

      <Table>
        <TableHeader><h2 className="font-semibold text-slate-900">Invoices</h2></TableHeader>
        <TableWrapper>
          <Thead><tr><Th>Invoice</Th><Th>Session</Th><Th>Issued</Th><Th>Amount</Th><Th>Adjustments</Th><Th>Paid</Th><Th>Balance</Th><Th>Status</Th><Th /></tr></Thead>
          <Tbody>
            {invoices.length === 0 ? (
              <tr><Td colSpan={9} className="py-10 text-center text-slate-500">No invoices yet. Your first fee invoice will appear after session registration.</Td></tr>
            ) : invoices.map((invoice) => {
              const expanded = expandedInvoiceId === invoice.id;
              return [
                <tr key={invoice.id}>
                  <Td className="font-medium text-slate-900">{invoice.invoice_number}</Td><Td>{invoice.session_name ?? '-'}</Td><Td>{invoice.issue_date ?? '-'}</Td><Td>{money(invoice.amount_due)}</Td><Td>{money(invoice.adjustment_amount)}</Td><Td>{money(invoice.paid_amount)}</Td><Td className="font-semibold">{money(invoice.balance_due)}</Td><Td><StatusBadge status={invoice.status} /></Td>
                  <Td><button type="button" onClick={() => setExpandedInvoiceId(expanded ? null : invoice.id)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Toggle invoice details">{expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</button></Td>
                </tr>,
                expanded ? (
                  <tr key={`${invoice.id}-details`}><Td colSpan={9} className="bg-slate-50 p-5"><div className="grid gap-5 lg:grid-cols-2">
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Line items</p><div className="mt-2 space-y-2">{(invoice.items ?? []).map((item) => <div key={item.id} className="flex justify-between rounded-lg bg-white px-3 py-2 text-sm"><span>{item.name}</span><strong>{money(item.total_amount)}</strong></div>)}</div></div>
                    <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Adjustments</p><div className="mt-2 space-y-2">{(invoice.adjustments ?? []).length ? invoice.adjustments.map((adjustment) => <div key={adjustment.id} className="flex justify-between rounded-lg bg-white px-3 py-2 text-sm"><span className="capitalize">{adjustment.type}</span><strong>{money(adjustment.amount)}</strong></div>) : <p className="text-sm text-slate-500">No adjustments.</p>}</div></div>
                  </div></Td></tr>
                ) : null,
              ];
            })}
          </Tbody>
        </TableWrapper>
      </Table>

      <Table>
        <TableHeader><h2 className="font-semibold text-slate-900">Ledger</h2></TableHeader>
        <TableWrapper>
          <Thead><tr><Th>Date</Th><Th>Session</Th><Th>Type</Th><Th>Reference</Th><Th>Description</Th><Th>Debit</Th><Th>Credit</Th></tr></Thead>
          <Tbody>{entries.length === 0 ? <tr><Td colSpan={7} className="py-10 text-center text-slate-500">No ledger activity yet.</Td></tr> : entries.map((entry) => <tr key={entry.id}><Td>{entry.transaction_date ?? '-'}</Td><Td>{entry.session_name ?? '-'}</Td><Td className="capitalize">{entry.type}</Td><Td>{entry.reference ?? entry.payment_ref ?? entry.invoice_number ?? '-'}</Td><Td>{entry.description ?? '-'}</Td><Td>{entry.debit > 0 ? money(entry.debit) : '-'}</Td><Td>{entry.credit > 0 ? money(entry.credit) : '-'}</Td></tr>)}</Tbody>
        </TableWrapper>
      </Table>
    </section>
  );
}

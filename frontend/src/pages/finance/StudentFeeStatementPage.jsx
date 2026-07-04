import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Table, TableHeader, TableWrapper, Tbody, Td, Th, Thead } from '@/components/DataTable';
import { LookupSelect } from '@/components/LookupSelect';
import { useAcademicSessionsApi } from '@/hooks/useAcademicSessionsApi';
import { useAcademicYearsApi } from '@/hooks/useAcademicYearsApi';
import { useInvoicesApi } from '@/hooks/useInvoicesApi';
import { useLookupApi } from '@/hooks/useLookupApi';
import { getApiErrorMessage } from '@/lib/api/authClient';

const money = (value) => `Ksh ${Number(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const scopes = { session_to_date: 'Session 1 to date', per_session: 'Single session', per_year: 'Full academic year', custom: 'Custom session range' };

export function StudentFeeStatementPage({ selfService = false }) {
  const invoicesApi = useInvoicesApi();
  const lookupApi = useLookupApi();
  const sessionsApi = useAcademicSessionsApi();
  const yearsApi = useAcademicYearsApi();

  const [studentId, setStudentId] = useState(selfService ? 'me' : null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [statement, setStatement] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [years, setYears] = useState([]);
  const [filters, setFilters] = useState({ scope: 'session_to_date', academic_year_id: '', academic_session_id: '', to_academic_session_id: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const params = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), [filters]);
  const visibleSessions = useMemo(() => filters.academic_year_id ? sessions.filter((session) => session.academic_year_id === filters.academic_year_id) : sessions, [filters.academic_year_id, sessions]);

  useEffect(() => {
    Promise.all([sessionsApi.list({ per_page: 100, status: 'all', sort_by: 'start_date', sort_direction: 'asc' }), yearsApi.list({ per_page: 100 })])
      .then(([sessionResponse, yearResponse]) => { setSessions(sessionResponse.data ?? []); setYears(yearResponse.data ?? []); })
      .catch(() => {});
  }, [sessionsApi, yearsApi]);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    if (filters.scope === 'per_session' && !filters.academic_session_id) { setStatement(null); setLoading(false); return; }
    if (filters.scope === 'custom' && (!filters.academic_session_id || !filters.to_academic_session_id)) { setStatement(null); setLoading(false); return; }
    let current = true;
    setLoading(true);
    setError('');
    const request = selfService ? invoicesApi.myStatement(params) : invoicesApi.studentStatement(studentId, params);
    request
      .then((response) => { if (current) setStatement(response.data); })
      .catch((requestError) => { if (current) setError(getApiErrorMessage(requestError, 'Failed to load the fee statement.')); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [filters.academic_session_id, filters.scope, filters.to_academic_session_id, invoicesApi, params, selfService, studentId]);

  function update(name, value) {
    setFilters((current) => ({ ...current, [name]: value, ...(name === 'academic_year_id' ? { academic_session_id: '', to_academic_session_id: '' } : {}) }));
  }

  const fetchStudents = (query) => lookupApi.search('students', { query, limit: 10 }).then((response) => response.data ?? []).catch(() => []);

  async function download() {
    setDownloading(true);
    try {
      const response = selfService
        ? await invoicesApi.downloadMyStatement(params)
        : await invoicesApi.downloadStudentStatement(studentId, params);
      const blob = response.data;
      const disposition = response.headers?.['content-disposition'] ?? '';
      const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const regularMatch = disposition.match(/filename="?([^";]+)"?/i);
      const filename = encodedMatch
        ? decodeURIComponent(encodedMatch[1])
        : regularMatch?.[1] ?? `fee-statement-${filters.scope}.pdf`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = filename;
      document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
    } catch (requestError) { setError(getApiErrorMessage(requestError, 'Failed to download the statement.')); }
    finally { setDownloading(false); }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Fee Statement</h1>
          <p className="mt-1 text-sm text-slate-500">Choose exactly which sessions the statement should cover.</p>
        </div>
        <button type="button" onClick={download} disabled={downloading || !statement} className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">
          <Download className="size-4" />{downloading ? 'Downloading...' : 'Download PDF'}
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        {!selfService && (
          <LookupSelect label="Student" placeholder="Search by admission number or name" value={selectedStudent?.id ?? ''} selectedOption={selectedStudent} onChange={(id, option) => { setStudentId(id); setSelectedStudent(option); }} fetchOptions={fetchStudents} />
        )}
        <label className="text-xs font-medium text-slate-600">Statement scope<select value={filters.scope} onChange={(e) => update('scope', e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">{Object.entries(scopes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {['per_year', 'custom'].includes(filters.scope) && <label className="text-xs font-medium text-slate-600">Academic year<select value={filters.academic_year_id} onChange={(e) => update('academic_year_id', e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">Current active year</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name ?? year.code}</option>)}</select></label>}
        {['per_session', 'custom'].includes(filters.scope) && <label className="text-xs font-medium text-slate-600">{filters.scope === 'custom' ? 'From session' : 'Session'}<select value={filters.academic_session_id} onChange={(e) => update('academic_session_id', e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">Select session</option>{visibleSessions.map((session) => <option key={session.id} value={session.id}>{session.academic_year_name} · {session.name}</option>)}</select></label>}
        {filters.scope === 'custom' && <label className="text-xs font-medium text-slate-600">To session<select value={filters.to_academic_session_id} onChange={(e) => update('to_academic_session_id', e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">Select session</option>{visibleSessions.map((session) => <option key={session.id} value={session.id}>{session.academic_year_name} · {session.name}</option>)}</select></label>}
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading statement...</div>}
      {!loading && statement && <>
        {(statement.dormant_fees ?? []).length > 0 && <Table><TableHeader><div><h2 className="font-semibold text-slate-900">Dormant future fees</h2><p className="text-xs text-slate-500">Shown only because this statement includes future sessions.</p></div></TableHeader><TableWrapper><Thead><tr><Th>Session</Th><Th>Fee</Th><Th>Amount</Th><Th>Status</Th></tr></Thead><Tbody>{statement.dormant_fees.map((fee) => <tr key={fee.assignment_id}><Td>{fee.session_name}</Td><Td>{fee.template_name}</Td><Td>{money(fee.amount)}</Td><Td className="capitalize">{fee.status}</Td></tr>)}</Tbody></TableWrapper></Table>}
        <Table><TableHeader><h2 className="font-semibold text-slate-900">Transactions</h2></TableHeader><TableWrapper><Thead><tr><Th>Date</Th><Th>Session</Th><Th>Reference</Th><Th>Description</Th><Th>Debit</Th><Th>Credit</Th><Th>Balance</Th></tr></Thead><Tbody>{(statement.transactions ?? []).length ? statement.transactions.map((entry) => <tr key={entry.id}><Td>{entry.date ?? '-'}</Td><Td>{entry.session_name ?? '-'}</Td><Td>{entry.reference ?? '-'}</Td><Td>{entry.description}</Td><Td>{entry.debit > 0 ? money(entry.debit) : '-'}</Td><Td>{entry.credit > 0 ? money(entry.credit) : '-'}</Td><Td>{money(entry.balance)}</Td></tr>) : <tr><Td colSpan={7} className="py-8 text-center text-slate-500">No transactions in this scope.</Td></tr>}</Tbody></TableWrapper></Table>
      </>}
      {!loading && !statement && !error && studentId && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Select a scope above to view the statement.</div>}
    </section>
  );
}

export default StudentFeeStatementPage;

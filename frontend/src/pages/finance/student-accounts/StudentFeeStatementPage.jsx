import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import logo from "@/assets/logo.PNG";
import { LookupSelect } from '@/components/LookupSelect';
import { useAcademicSessionsApi } from '@/hooks/useAcademicSessionsApi';
import { useAcademicYearsApi } from '@/hooks/useAcademicYearsApi';
import { useInvoicesApi } from '@/hooks/useInvoicesApi';
import { useLookupApi } from '@/hooks/useLookupApi';
import { getApiErrorMessage } from '@/lib/api/authClient';

const money = (value) => Number(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const scopes = { session_to_date: 'Session 1 to date', per_session: 'Single session', per_year: 'Full academic year', custom: 'Custom session range' };

function valueOrDash(value) {
  return value === null || value === undefined || value === '' ? '-' : value;
}

export function StudentFeeStatementPage({ role = "admin" }) {
  const invoicesApi = useInvoicesApi();
  const lookupApi = useLookupApi();
  const sessionsApi = useAcademicSessionsApi();
  const yearsApi = useAcademicYearsApi();

  const [studentId, setStudentId] = useState(role === "student" ? 'me' : null);
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
    const request = role === "student" ? invoicesApi.myStatement(params) : invoicesApi.studentStatement(studentId, params);
    request
      .then((response) => { if (current) setStatement(response.data); })
      .catch((requestError) => { if (current) setError(getApiErrorMessage(requestError, 'Failed to load the fee statement.')); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [filters.academic_session_id, filters.scope, filters.to_academic_session_id, invoicesApi, params, role === "student", studentId]);

  function update(name, value) {
    setFilters((current) => ({ ...current, [name]: value, ...(name === 'academic_year_id' ? { academic_session_id: '', to_academic_session_id: '' } : {}) }));
  }

  const fetchStudents = (query) => lookupApi.search('students', { query, limit: 10 }).then((response) => response.data ?? []).catch(() => []);

  async function download() {
    setDownloading(true);
    try {
      const response = role === "student"
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

  const student = statement?.student ?? {};
  const course = statement?.course ?? {};
  const institution = statement?.institution ?? {};
  const transactions = statement?.transactions ?? [];
  const summary = statement?.summary ?? {};
  const dormantFees = statement?.dormant_fees ?? [];

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
        {role !== "student" && (
          <LookupSelect label="Student" placeholder="Search by admission number or name" value={selectedStudent?.id ?? ''} selectedOption={selectedStudent} onChange={(id, option) => { setStudentId(id); setSelectedStudent(option); }} fetchOptions={fetchStudents} />
        )}
        <label className="text-xs font-medium text-slate-600">Statement scope<select value={filters.scope} onChange={(e) => update('scope', e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm">{Object.entries(scopes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {['per_year', 'custom'].includes(filters.scope) && <label className="text-xs font-medium text-slate-600">Academic year<select value={filters.academic_year_id} onChange={(e) => update('academic_year_id', e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">Current active year</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name ?? year.code}</option>)}</select></label>}
        {['per_session', 'custom'].includes(filters.scope) && <label className="text-xs font-medium text-slate-600">{filters.scope === 'custom' ? 'From session' : 'Session'}<select value={filters.academic_session_id} onChange={(e) => update('academic_session_id', e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">Select session</option>{visibleSessions.map((session) => <option key={session.id} value={session.id}>{session.academic_year_name} · {session.name}</option>)}</select></label>}
        {filters.scope === 'custom' && <label className="text-xs font-medium text-slate-600">To session<select value={filters.to_academic_session_id} onChange={(e) => update('to_academic_session_id', e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">Select session</option>{visibleSessions.map((session) => <option key={session.id} value={session.id}>{session.academic_year_name} · {session.name}</option>)}</select></label>}
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading statement...</div>}
      {!loading && !statement && !error && studentId && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Select a scope above to view the statement.</div>}

      {!loading && statement ? (
        <div className="space-y-5">
          {dormantFees.length > 0 && (
            <div className="rounded-xl border border-slate-200/80 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Dormant future fees</h2>
              <p className="mb-3 text-xs text-slate-500">Shown only because this statement includes future sessions.</p>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] font-semibold text-slate-600">
                    <th className="pb-2 pr-3">Session</th>
                    <th className="pb-2 pr-3">Fee</th>
                    <th className="pb-2 pr-3 text-right">Amount</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dormantFees.map((fee) => (
                    <tr key={fee.assignment_id} className="border-b border-slate-100">
                      <td className="py-2 pr-3 text-slate-800">{fee.session_name}</td>
                      <td className="py-2 pr-3 text-slate-800">{fee.template_name}</td>
                      <td className="py-2 pr-3 text-right text-slate-800">{money(fee.amount)}</td>
                      <td className="py-2 text-right capitalize text-slate-600">{fee.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mx-auto max-w-[210mm] overflow-hidden rounded-sm border border-slate-300 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <article className="flex min-h-[297mm] flex-col px-[12mm] py-[10mm] text-black">
              <p className="mb-[2.5mm] text-[7pt] text-slate-500">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>

              <header className="text-center">
                <img src={logo} alt="Institution logo" className="mx-auto mb-[2.5mm] max-h-[18mm] max-w-[54mm] object-contain" />
                {institution.name ? (
                  <p className="text-[11pt] font-bold uppercase tracking-[0.02em] text-black">{institution.name}</p>
                ) : null}
                {institution.postal_address ? (
                  <p className="mt-[0.4mm] text-[7.5pt] text-slate-700">{institution.postal_address}</p>
                ) : null}
                {institution.telephone ? (
                  <p className="mt-[0.4mm] text-[7.5pt] text-slate-700">TEL: {institution.telephone}</p>
                ) : null}
                {institution.email ? (
                  <p className="mt-[0.4mm] text-[7.5pt] text-slate-700">Email: {institution.email}</p>
                ) : null}
                {institution.website ? (
                  <p className="mt-[0.4mm] text-[7.5pt] text-slate-700">Web: {institution.website}</p>
                ) : null}
                <p className="mt-[2.8mm] text-[10pt] font-bold tracking-[0.08em] text-black">FEE STATEMENT</p>
              </header>

              <div className="mt-[2.2mm] border-t border-black" />

              <table className="mt-[1.8mm] w-full border-collapse text-[7.4pt] leading-[1.25]" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col className="w-[15%]" />
                  <col className="w-[37%]" />
                  <col className="w-[14%]" />
                  <col className="w-[34%]" />
                </colgroup>
                <tbody>
                  <tr>
                    <td className="border border-black px-[1.2mm] py-[1.35mm] align-top font-bold text-slate-700">STUDENT NAME:</td>
                    <td className="border border-black px-[1.2mm] py-[1.35mm] align-top text-black">{valueOrDash(student.name)}</td>
                    <td className="border border-black px-[1.2mm] py-[1.35mm] align-top font-bold text-slate-700">REG NO:</td>
                    <td className="border border-black px-[1.2mm] py-[1.35mm] align-top text-black">{valueOrDash(student.admission_number)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black px-[1.2mm] py-[1.35mm] align-top font-bold text-slate-700">PROGRAM:</td>
                    <td className="border border-black px-[1.2mm] py-[1.35mm] align-top text-black">{valueOrDash(course.name)}</td>
                    <td className="border border-black px-[1.2mm] py-[1.35mm] align-top font-bold text-slate-700">ADMISSION YEAR:</td>
                    <td className="border border-black px-[1.2mm] py-[1.35mm] align-top text-black">{valueOrDash(student.admission_year)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black px-[1.2mm] py-[1.35mm] align-top font-bold text-slate-700">DEPARTMENT:</td>
                    <td className="border border-black px-[1.2mm] py-[1.35mm] align-top text-black">{valueOrDash(course.department)}</td>
                    <td className="border border-black px-[1.2mm] py-[1.35mm] align-top font-bold text-slate-700">YEAR OF STUDY:</td>
                    <td className="border border-black px-[1.2mm] py-[1.35mm] align-top text-black">{valueOrDash(student.year_of_study)}</td>
                  </tr>
                  <tr>
                    <td className="border border-black px-[1.2mm] py-[1.35mm] align-top font-bold text-slate-700">SCHOOL/FACULTY:</td>
                    <td className="border border-black px-[1.2mm] py-[1.35mm] align-top text-black">{valueOrDash(course.school || course.level)}</td>
                    <td className="border border-black px-[1.2mm] py-[1.35mm] align-top font-bold text-slate-700">STUDENT TYPE:</td>
                    <td className="border border-black px-[1.2mm] py-[1.35mm] align-top text-black">{valueOrDash(student.type || 'Regular')}</td>
                  </tr>
                </tbody>
              </table>

              <table className="mt-[2.4mm] w-full border-collapse text-[7pt] leading-[1.25]" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col className="w-[6%]" />
                  <col className="w-[12%]" />
                  <col className="w-[13%]" />
                  <col className="w-[31%]" />
                  <col className="w-[12.6%]" />
                  <col className="w-[12.6%]" />
                  <col className="w-[12.8%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="border border-black px-[1mm] py-[1.3mm] text-left text-[7.1pt] font-bold text-slate-700">No.</th>
                    <th className="border border-black px-[1mm] py-[1.3mm] text-left text-[7.1pt] font-bold text-slate-700">Date</th>
                    <th className="border border-black px-[1mm] py-[1.3mm] text-left text-[7.1pt] font-bold text-slate-700">Ref</th>
                    <th className="border border-black px-[1mm] py-[1.3mm] text-left text-[7.1pt] font-bold text-slate-700">Description</th>
                    <th className="border border-black px-[1mm] py-[1.3mm] text-center text-[7.1pt] font-bold text-slate-700">Debit (KES)</th>
                    <th className="border border-black px-[1mm] py-[1.3mm] text-center text-[7.1pt] font-bold text-slate-700">Credit (KES)</th>
                    <th className="border border-black px-[1mm] py-[1.3mm] text-center text-[7.1pt] font-bold text-slate-700">Balance (KES)</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length > 0 ? (
                    (() => {
                      const rows = [];
                      transactions.forEach((entry, idx) => {
                        const prev = idx > 0 ? transactions[idx - 1] : null;
                        if (idx === 0 || entry.academic_session_id !== (prev?.academic_session_id ?? null)) {
                          rows.push(
                            <tr key={`s-${entry.academic_session_id || 'other'}`}>
                              <th colSpan={7} className="border border-black px-[1mm] py-[1.3mm] text-left text-[7.2pt] font-bold uppercase text-slate-700" style={{ background: '#f3f4f6' }}>
                                {entry.session_label || 'OTHER TRANSACTIONS'}
                              </th>
                            </tr>
                          );
                        }
                        rows.push(
                          <tr key={entry.id}>
                            <td className="border border-black px-[1mm] py-[1.3mm] align-top text-black">{entry.number}</td>
                            <td className="border border-black px-[1mm] py-[1.3mm] align-top text-black">{entry.date}</td>
                            <td className="border border-black px-[1mm] py-[1.3mm] align-top text-black">{entry.reference ?? '-'}</td>
                            <td className="border border-black px-[1mm] py-[1.3mm] align-top text-black">{entry.description}</td>
                            <td className="border border-black px-[1mm] py-[1.3mm] text-right align-top text-black">{entry.debit > 0 ? money(entry.debit) : ''}</td>
                            <td className="border border-black px-[1mm] py-[1.3mm] text-right align-top text-black">{entry.credit > 0 ? money(entry.credit) : ''}</td>
                            <td className="border border-black px-[1mm] py-[1.3mm] text-right align-top text-black">{money(entry.balance)}</td>
                          </tr>
                        );
                      });
                      rows.push(
                        <tr key="total-row" className="font-bold">
                          <th colSpan={4} className="border border-black px-[1mm] py-[1.3mm] text-right text-[7.2pt] text-slate-700">TOTAL</th>
                          <td className="border border-black px-[1mm] py-[1.3mm] text-right text-[7.2pt] text-black">{money(summary.total_debit)}</td>
                          <td className="border border-black px-[1mm] py-[1.3mm] text-right text-[7.2pt] text-black">{money(summary.total_credit)}</td>
                          <td className="border border-black px-[1mm] py-[1.3mm] text-right text-[7.2pt] text-black">{money(summary.ledger_balance)}</td>
                        </tr>
                      );
                      return rows;
                    })()
                  ) : (
                    <tr><td colSpan={7} className="border border-black p-[8mm] text-center text-slate-500">No fee transactions found.</td></tr>
                  )}
                </tbody>
              </table>

              <footer className="mt-auto border-t border-black pt-[1.6mm] text-[7pt] uppercase text-slate-600">
                Fee Statement
              </footer>
            </article>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default StudentFeeStatementPage;
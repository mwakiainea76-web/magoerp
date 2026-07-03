import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { bodyTextClassName, selectClassName, labelClassName } from "@/lib/styles";
import { LookupSelect } from "@/components/LookupSelect";
import { Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td, TableFooter } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { useLedgerApi } from "@/hooks/useLedgerApi";
import { useFinanceReportsApi } from "@/hooks/useFinanceReportsApi";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { useStudentsApi } from "@/hooks/useStudentsApi";

export function LedgerPage() {
  const ledgerApi = useLedgerApi();
  const reportsApi = useFinanceReportsApi();
  const sessionsApi = useAcademicSessionsApi();
  const studentsApi = useStudentsApi();

  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState("");

  const [sessions, setSessions] = useState([]);
  const [filterSession, setFilterSession] = useState("");
  const [filterStudent, setFilterStudent] = useState("");
  const [filterStudentOption, setFilterStudentOption] = useState(null);

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  const loadSessions = useCallback(async () => {
    try {
      const res = await sessionsApi.list({ per_page: 50, sort_direction: "desc" });
      setSessions(res.data ?? []);
    } catch {
      // silent
    }
  }, [sessionsApi]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const fetchStudentOptions = useCallback(async (query) => {
    const res = await studentsApi.list({ q: query, per_page: 20 });
    return (res.data ?? []).map((s) => ({
      id: s.id,
      label: `${s.admission_number} - ${s.full_name}`,
    }));
  }, [studentsApi]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const params = { page, per_page: perPage };
      if (filterStudent) params.student_id = filterStudent;
      if (filterSession) params.academic_session_id = filterSession;
      const res = await ledgerApi.list(params);
      setEntries(res.data ?? []);
      setTotal(res.meta?.total ?? 0);
      setLastPage(res.meta?.last_page ?? 1);
    } catch (e) {
      setError(e?.response?.data?.message ?? "Failed to load ledger entries.");
    } finally {
      setIsLoading(false);
    }
  }, [ledgerApi, filterStudent, filterSession, page, perPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleExport() {
    setIsExporting(true);
    try {
      const blob = await reportsApi.exportLedger({ student_id: filterStudent || undefined, academic_session_id: filterSession || undefined });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = "student-ledger.csv"; anchor.click(); URL.revokeObjectURL(url);
    } finally { setIsExporting(false); }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Student Ledger</h1><p className="text-[13px] text-slate-500">View all financial transactions across students</p></div>
        <button type="button" onClick={handleExport} disabled={isExporting} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-700 px-4 text-sm font-medium text-white disabled:opacity-60"><Download className="size-4" />{isExporting ? "Exporting..." : "Export CSV"}</button>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <LookupSelect
              label="Student"
              value={filterStudent}
              selectedOption={filterStudentOption}
              onChange={(nextValue, option) => {
                setFilterStudent(nextValue);
                setFilterStudentOption(option);
                setPage(1);
              }}
              fetchOptions={fetchStudentOptions}
              placeholder="Search student..."
              emptyMessage="No students found"
              clearable
            />
          </div>
          <div>
            <label htmlFor="filterSession" className={`mb-2 block text-slate-600 ${labelClassName}`}>Academic Session</label>
            <select
              id="filterSession"
              value={filterSession}
              onChange={(e) => { setFilterSession(e.target.value); setPage(1); }}
              className={`${selectClassName} w-full`}
            >
              <option value="">All Sessions</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      <Table>
        <TableHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-[1.0625rem] font-semibold text-slate-900">Ledger Entries</h2>
            <button type="button" onClick={loadData} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-medium text-slate-600 transition hover:bg-slate-50">
              Refresh
            </button>
          </div>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading entries...</div>
        ) : entries.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>
            No ledger entries found. Use the filters above to narrow results.
          </div>
        ) : (
          <>
            <TableWrapper>
              <Thead>
                <tr>
                  <Th className="w-10 text-center">#</Th>
                  <Th>Student</Th>
                  <Th>Admission</Th>
                  <Th>Type</Th>
                  <Th>Description</Th>
                  <Th className="text-right">Debit (KSh)</Th>
                  <Th className="text-right">Credit (KSh)</Th>
                  <Th className="text-right">Net (KSh)</Th>
                  <Th>Date</Th>
                </tr>
              </Thead>
              <Tbody>
                {entries.map((entry, index) => (
                  <tr key={entry.id}>
                    <Td className="w-10 text-center text-slate-400">{(page - 1) * perPage + index + 1}</Td>
                    <Td className="font-medium text-slate-800">{entry.student_name ?? "—"}</Td>
                    <Td className="text-slate-700">{entry.admission_number ?? "—"}</Td>
                    <Td>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        entry.type === "payment" ? "bg-emerald-50 text-emerald-700" :
                        entry.type === "invoice" ? "bg-blue-50 text-blue-700" :
                        "bg-amber-50 text-amber-700"
                      }`}>
                        {entry.type}
                      </span>
                    </Td>
                    <Td className="max-w-[200px] truncate text-slate-600">{entry.description ?? "—"}</Td>
                    <Td className="text-right font-medium text-red-600">{entry.debit > 0 ? entry.debit.toLocaleString() : "—"}</Td>
                    <Td className="text-right font-medium text-emerald-600">{entry.credit > 0 ? entry.credit.toLocaleString() : "—"}</Td>
                    <Td className={`text-right font-semibold ${entry.net > 0 ? "text-red-600" : entry.net < 0 ? "text-emerald-600" : "text-slate-500"}`}>
                      {entry.net.toLocaleString()}
                    </Td>
                    <Td className="text-slate-600">{entry.transaction_date ?? "—"}</Td>
                  </tr>
                ))}
              </Tbody>
            </TableWrapper>
            {total > 0 && (
              <TableFooter>
                <PaginationFooter
                  page={page}
                  perPage={perPage}
                  total={total}
                  lastPage={lastPage}
                  onPageChange={setPage}
                  onPerPageChange={setPerPage}
                />
              </TableFooter>
            )}
          </>
        )}
      </Table>
    </section>
  );
}

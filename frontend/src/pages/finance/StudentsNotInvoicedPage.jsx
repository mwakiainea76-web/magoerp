import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Search, ExternalLink } from "lucide-react";
import { authClient } from "@/lib/api/authClient";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td, TableFooter } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function StudentsNotInvoicedPage() {
  const sessionsApi = useAcademicSessionsApi();

  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [search, setSearch] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  const loadSessions = useCallback(async () => {
    try {
      const res = await sessionsApi.list({ per_page: 100, sort_direction: "desc" });
      setSessions(res.data ?? []);
    } catch {
      // silent
    }
  }, [sessionsApi]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const loadData = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setError("");
    try {
      const params = { academic_session_id: sessionId, page, per_page: perPage };
      if (search.trim()) params.q = search.trim();
      const res = await authClient.get("/finance/students-not-invoiced", { params });
      const body = res.data;
      setStudents(body.data ?? []);
      setTotal(body.meta?.total ?? 0);
      setLastPage(body.meta?.last_page ?? 1);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load students."));
    } finally {
      setLoading(false);
    }
  }, [sessionId, page, perPage, search]);

  useEffect(() => {
    if (sessionId) {
      setPage(1);
    }
  }, [sessionId, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleSearchKeyDown(e) {
    if (e.key === "Enter") {
      setPage(1);
      loadData();
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">Students Not Invoiced</h1>
        <p className="text-[13px] text-slate-500">Students enrolled in a session who have not been invoiced</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-72">
          <label className="mb-1 block text-[13px] font-medium text-slate-600">Academic Session</label>
          <select value={sessionId} onChange={e => setSessionId(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
            <option value="">Select a session...</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="mb-1 block text-[13px] font-medium text-slate-600">Search</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Admission no. or name..."
              className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-[13px] outline-none focus:border-emerald-500" />
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

      <Table>
        <TableHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-slate-900">
              {sessionId ? `${students.length} of ${total} student(s) not invoiced` : "Select a session to view"}
            </h2>
          </div>
        </TableHeader>

        {loading ? (
          <div className="flex items-center justify-center px-5 py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        ) : !sessionId ? (
          <div className="px-5 py-12 text-center text-[13px] text-slate-500">
            Choose an academic session above.
          </div>
        ) : students.length === 0 ? (
          <div className="px-5 py-12 text-center text-[13px] text-slate-500">
            All students in this session have been invoiced.
          </div>
        ) : (
          <>
            <TableWrapper>
              <Thead>
                <tr>
                  <Th className="w-10 text-center">#</Th>
                  <Th>Admission No.</Th>
                  <Th>Student Name</Th>
                  <Th>Course</Th>
                  <Th className="text-center">Year</Th>
                  <Th className="text-center">Session #</Th>
                  <Th className="w-20 text-center">Action</Th>
                </tr>
              </Thead>
              <Tbody>
                {students.map((s, i) => (
                  <tr key={s.id}>
                    <Td className="w-10 text-center text-slate-400">{(page - 1) * perPage + i + 1}</Td>
                    <Td className="font-mono text-[13px]">{s.admission_number}</Td>
                    <Td className="font-medium text-slate-900">{s.full_name}</Td>
                    <Td className="text-slate-600">{s.course_name || "—"}</Td>
                    <Td className="text-center">{s.year_of_study ?? "—"}</Td>
                    <Td className="text-center">{s.session_number ?? "—"}</Td>
                    <Td className="text-center">
                      <button type="button" onClick={() => navigate(`/admin/finance/student-accounts/${s.id}`)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-medium text-slate-600 hover:bg-slate-50">
                        <ExternalLink className="h-3 w-3" /> Open
                      </button>
                    </Td>
                  </tr>
                ))}
              </Tbody>
            </TableWrapper>
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
          </>
        )}
      </Table>
    </section>
  );
}

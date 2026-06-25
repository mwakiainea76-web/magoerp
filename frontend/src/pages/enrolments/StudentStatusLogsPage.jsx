import { useEffect, useState } from "react";
import { bodyTextClassName, labelTextClassName, inputClassName, selectClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import {
  Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td, TableFooter,
} from "@/components/DataTable";
import { useCourseEnrolmentsApi } from "@/hooks/useCourseEnrolmentsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const statusStyles = {
  enrolled: "bg-emerald-50 text-emerald-700",
  transferred: "bg-sky-50 text-sky-700",
  deferred: "bg-amber-50 text-amber-700",
  expelled: "bg-red-50 text-red-700",
  graduated: "bg-violet-50 text-violet-700",
};

export function StudentStatusLogsPage() {
  const api = useCourseEnrolmentsApi();
  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true); setError("");
      try {
        const res = await api.statusLogs({ q: query, status: statusFilter, page, per_page: perPage });
        if (mounted) { setLogs(res.data ?? []); setMeta(res.meta ?? initialMeta); }
      } catch (e) { if (mounted) setError(getApiErrorMessage(e, "Failed to load.")); }
      finally { if (mounted) setIsLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, [api, page, perPage, query, statusFilter]);

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Student Status Logs</h1>
        <p className="text-[13px] text-slate-500">Track enrollment status changes</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(searchInput.trim()); }} className="rounded-xl border border-slate-200/80 bg-white p-5">
        <div className="grid gap-4 xl:grid-cols-[1.6fr_0.6fr_0.5fr_auto] xl:items-end">
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Search</label>
            <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className={inputClassName} placeholder="Student name or admission #..." />
          </div>
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={`${selectClassName} w-full`}>
              <option value="">All</option>
              <option value="enrolled">Enrolled</option>
              <option value="transferred">Transferred</option>
              <option value="deferred">Deferred</option>
              <option value="expelled">Expelled</option>
              <option value="graduated">Graduated</option>
            </select>
          </div>
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Per Page</label>
            <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }} className={`${selectClassName} w-full`}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex gap-3">
            <FormButton type="submit">Apply</FormButton>
            <FormButton type="button" variant="secondary" onClick={() => { setSearchInput(""); setQuery(""); setStatusFilter(""); setPage(1); }}>Reset</FormButton>
          </div>
        </div>
      </form>

      {error ? <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div> : null}

      <Table>
        <TableHeader><h2 className="text-[1.0625rem] font-semibold text-slate-900">Status Changes</h2></TableHeader>
        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading...</div>
        ) : logs.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No status changes found.</div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <Th>Student</Th>
                <Th>From</Th>
                <Th>To</Th>
                <Th>Reason</Th>
                <Th>Date</Th>
                <Th>Recorded By</Th>
              </tr>
            </Thead>
            <Tbody>
              {logs.map((log, i) => (
                <tr key={log.id}>
                  <Td className="w-10 text-center text-slate-400">{(meta.current_page - 1) * meta.per_page + i + 1}</Td>
                  <Td>
                    <div className="font-medium text-slate-900">{log.student_name}</div>
                    <div className="text-[12px] text-slate-500">{log.admission_number}</div>
                  </Td>
                  <Td>{log.from_status ? <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[log.from_status] ?? "bg-slate-50 text-slate-600"}`}>{log.from_status}</span> : <span className="text-slate-400">—</span>}</Td>
                  <Td><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[log.to_status] ?? "bg-slate-50 text-slate-600"}`}>{log.to_status}</span></Td>
                  <Td className="max-w-[200px] truncate text-slate-500">{log.reason ?? "—"}</Td>
                  <Td className="text-slate-500">{log.effective_date}</Td>
                  <Td className="text-slate-500">{log.recorded_by}</Td>
                </tr>
              ))}
            </Tbody>
          </TableWrapper>
        )}
        <TableFooter>
          <p className={`text-slate-500 ${bodyTextClassName}`}>{meta.total > 0 ? `Showing ${meta.from} to ${meta.to} of ${meta.total} changes` : "No results"}</p>
          <div className="flex items-center gap-3">
            <FormButton type="button" variant="secondary" className="h-9 w-auto px-4" disabled={meta.current_page <= 1 || isLoading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</FormButton>
            <span className={`text-slate-500 ${bodyTextClassName}`}>Page {meta.current_page} of {meta.last_page}</span>
            <FormButton type="button" variant="secondary" className="h-9 w-auto px-4" disabled={meta.current_page >= meta.last_page || isLoading} onClick={() => setPage((p) => p + 1)}>Next</FormButton>
          </div>
        </TableFooter>
      </Table>
    </section>
  );
}

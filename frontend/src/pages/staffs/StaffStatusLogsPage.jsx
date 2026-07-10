import { useEffect, useState } from "react";
import { FormInput } from "@/components/FormInput";
import { bodyTextClassName, labelTextClassName, selectClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { PaginationFooter } from "@/components/PaginationFooter";
import {
  Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td,
} from "@/components/DataTable";
import { useStaffsApi } from "@/hooks/useStaffsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700",
  inactive: "bg-red-50 text-red-700",
};

export function StaffStatusLogsPage() {
  const api = useStaffsApi();
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
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Staff Status Logs</h1>
        <p className="text-[13px] text-slate-500">Track staff status changes</p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(searchInput.trim()); }} className="rounded-xl border border-slate-200/80 bg-white p-5">
        <div className="grid gap-4 xl:grid-cols-[1.6fr_0.6fr_0.5fr_auto] xl:items-end">
          <FormInput value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Staff name or employee #..." />
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Status</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className={`${selectClassName} w-full`}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
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
                <Th>Staff</Th>
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
                    <div className="font-medium text-slate-900">{log.staff_name}</div>
                    <div className="text-[12px] text-slate-500">{log.employee_number}</div>
                  </Td>
                  <Td>{log.from_status ? <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[log.from_status] ?? "bg-slate-50 text-slate-600"}`}>{log.from_status}</span> : <span className="text-slate-400">—</span>}</Td>
                  <Td><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles[log.to_status] ?? "bg-slate-50 text-slate-600"}`}>{log.to_status}</span></Td>
                  <Td className="max-w-[200px] truncate text-slate-500">{log.reason ?? "—"}</Td>
                  <Td className="text-slate-500">{log.changed_at}</Td>
                  <Td className="text-slate-500">{log.changed_by}</Td>
                </tr>
              ))}
            </Tbody>
          </TableWrapper>
        )}
        <PaginationFooter page={page} perPage={perPage} total={meta.total} lastPage={meta.last_page} onPageChange={setPage} onPerPageChange={setPerPage} />
      </Table>
    </section>
  );
}

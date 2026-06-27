import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye } from "lucide-react";

import { bodyTextClassName, labelTextClassName, selectClassName, initialMeta } from "@/lib/styles";
import { PaginationFooter } from "@/components/PaginationFooter";
import { Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td, TableFooter } from "@/components/DataTable";
import { useComplaintsApi } from "@/hooks/useComplaintsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const statusStyles = {
  pending: "bg-amber-50 text-amber-700",
  in_review: "bg-sky-50 text-sky-700",
  escalated: "bg-orange-50 text-orange-700",
  resolved: "bg-emerald-50 text-emerald-700",
};

export function AdminComplaintsPage() {
  const api = useComplaintsApi();

  const [complaints, setComplaints] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError("");

    async function load() {
      try {
        const params = { page, per_page: perPage };
        if (statusFilter) params.status = statusFilter;
        const res = await api.adminIndex(params);

        if (mounted) {
          setComplaints(res.data ?? []);
          setMeta(res.meta ?? initialMeta);
        }
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load complaints."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [page, perPage, statusFilter]);

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Complaints</h1>
        <p className="text-[13px] text-slate-500">Manage student complaints and grievances</p>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className={`${selectClassName} w-full`}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_review">In Review</option>
              <option value="escalated">Escalated</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      <Table>
        <TableHeader>
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">All Complaints</h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading complaints...</div>
        ) : complaints.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No complaints found.</div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <Th>Student</Th>
                <Th>Subject</Th>
                <Th>Status</Th>
                <Th>Escalated To</Th>
                <Th>Submitted</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </Thead>
            <Tbody>
              {complaints.map((c, index) => (
                <tr key={c.id}>
                  <Td className="w-10 text-center text-slate-400">
                    {(meta.current_page - 1) * meta.per_page + index + 1}
                  </Td>
                  <Td>
                    <div className="font-medium text-slate-800">{c.student_name}</div>
                    <div className="text-[12px] text-slate-400">{c.admission_number}</div>
                  </Td>
                  <Td className="font-medium text-slate-800">{c.subject}</Td>
                  <Td>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                        statusStyles[c.status] ?? "bg-slate-50 text-slate-600"
                      }`}
                    >
                      {c.status.replace("_", " ")}
                    </span>
                  </Td>
                  <Td>{c.escalated_to_name ?? "—"}</Td>
                  <Td className="text-slate-500">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}
                  </Td>
                  <Td className="text-right">
                    <Link
                      to={`/complaints/${c.id}`}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Link>
                  </Td>
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

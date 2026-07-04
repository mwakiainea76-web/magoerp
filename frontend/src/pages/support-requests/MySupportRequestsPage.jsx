import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import { bodyTextClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td, TableFooter } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { useSupportRequestsApi } from "@/hooks/useSupportRequestsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const statusStyles = {
  pending: "bg-amber-50 text-amber-700",
  in_review: "bg-sky-50 text-sky-700",
  escalated: "bg-orange-50 text-orange-700",
  resolved: "bg-emerald-50 text-emerald-700",
};

export function MySupportRequestsPage() {
  const api = useSupportRequestsApi();
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const res = await api.myRequests();
        if (mounted) setRequests(res.data?.data ?? []);
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load requests."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const total = requests.length;
  const lastPage = Math.ceil(total / perPage);
  const paginatedRequests = requests.slice((page - 1) * perPage, page * perPage);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">My Requests</h1>
          <p className="text-[13px] text-slate-500">Track your submitted requests and inquiries</p>
        </div>
        <Link to="/support-requests/create">
          <FormButton>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </FormButton>
        </Link>
      </div>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      <Table>
        <TableHeader>
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">Submitted Requests</h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading requests...</div>
        ) : requests.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>
            No requests submitted yet.
          </div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <Th>Subject</Th>
                <Th>Status</Th>
                <Th>Escalated To</Th>
                <Th>Submitted</Th>
              </tr>
            </Thead>
            <Tbody>
              {paginatedRequests.map((r, index) => (
                <tr key={r.id}>
                  <Td className="w-10 text-center text-slate-400">{(page - 1) * perPage + index + 1}</Td>
                  <Td className="font-medium text-slate-800">{r.subject}</Td>
                  <Td>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${
                        statusStyles[r.status] ?? "bg-slate-50 text-slate-600"
                      }`}
                    >
                      {r.status.replace("_", " ")}
                    </span>
                  </Td>
                  <Td>{r.escalated_to_name ?? "—"}</Td>
                  <Td className="text-slate-500">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString() : "—"}
                  </Td>
                </tr>
              ))}
            </Tbody>
          </TableWrapper>
        )}

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
      </Table>
    </section>
  );
}

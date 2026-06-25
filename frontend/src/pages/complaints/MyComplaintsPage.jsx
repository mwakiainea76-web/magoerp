import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Eye } from "lucide-react";

import { bodyTextClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td } from "@/components/DataTable";
import { useComplaintsApi } from "@/hooks/useComplaintsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const statusStyles = {
  pending: "bg-amber-50 text-amber-700",
  in_review: "bg-sky-50 text-sky-700",
  escalated: "bg-orange-50 text-orange-700",
  resolved: "bg-emerald-50 text-emerald-700",
};

export function MyComplaintsPage() {
  const api = useComplaintsApi();
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const res = await api.myComplaints();
        if (mounted) setComplaints(res.data ?? []);
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load complaints."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">My Complaints</h1>
          <p className="text-[13px] text-slate-500">Track your submitted complaints and grievances</p>
        </div>
        <Link to="/complaints/create">
          <FormButton>
            <Plus className="mr-2 h-4 w-4" />
            New Complaint
          </FormButton>
        </Link>
      </div>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      <Table>
        <TableHeader>
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">Submitted Complaints</h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading complaints...</div>
        ) : complaints.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>
            No complaints submitted yet.
          </div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th>Subject</Th>
                <Th>Status</Th>
                <Th>Escalated To</Th>
                <Th>Submitted</Th>
              </tr>
            </Thead>
            <Tbody>
              {complaints.map((c) => (
                <tr key={c.id}>
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
                </tr>
              ))}
            </Tbody>
          </TableWrapper>
        )}
      </Table>
    </section>
  );
}

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { bodyTextClassName, labelTextClassName, selectClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td, TableFooter } from "@/components/DataTable";
import { useHostelsApi } from "@/hooks/useHostelsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function HostelAllocationsPage() {
  const api = useHostelsApi();

  const [allocations, setAllocations] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [hostels, setHostels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterHostel, setFilterHostel] = useState("");
  const [page, setPage] = useState(1);
  const [vacatingId, setVacatingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      const res = await api.list();
      if (mounted) setHostels(res.data ?? []);
    }
    init();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError("");
    async function load() {
      try {
        const params = { page, per_page: 20 };
        if (filterStatus) params.status = filterStatus;
        if (filterHostel) params.hostel_id = filterHostel;
        const res = await api.allocations(params);
        if (mounted) {
          setAllocations(res.data ?? []);
          setMeta(res.meta ?? initialMeta);
        }
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load allocations."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [page, filterStatus, filterHostel]);

  async function handleVacate(allocation) {
    if (!window.confirm(`Vacate ${allocation.student_name} from ${allocation.hostel_name}?`)) return;
    setVacatingId(allocation.id);
    try {
      await api.vacateAllocation(allocation.id);
      toast.success("Allocation vacated.");
      setPage(1);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to vacate."));
    } finally {
      setVacatingId(null);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Hostel Allocations</h1>
        <p className="text-[13px] text-slate-500">View and manage student hostel bed allocations</p>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Status</label>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className={`${selectClassName} w-full`}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="vacated">Vacated</option>
            </select>
          </div>
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Hostel</label>
            <select value={filterHostel} onChange={(e) => { setFilterHostel(e.target.value); setPage(1); }} className={`${selectClassName} w-full`}>
              <option value="">All Hostels</option>
              {hostels.map((h) => (<option key={h.id} value={h.id}>{h.name}</option>))}
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      <Table>
        <TableHeader>
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">All Allocations</h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading allocations...</div>
        ) : allocations.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No allocations found.</div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th>Student</Th>
                <Th>Hostel</Th>
                <Th>Room</Th>
                <Th>Bed</Th>
                <Th>Session</Th>
                <Th>Allocated</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </Thead>
            <Tbody>
              {allocations.map((a) => (
                <tr key={a.id}>
                  <Td>
                    <div className="font-medium text-slate-800">{a.student_name}</div>
                    <div className="text-[12px] text-slate-400">{a.admission_number}</div>
                  </Td>
                  <Td>{a.hostel_name}</Td>
                  <Td>{a.room_name}</Td>
                  <Td>{a.bed_label}</Td>
                  <Td>{a.session_name}</Td>
                  <Td>{a.allocated_on}</Td>
                  <Td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${a.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {a.status}
                    </span>
                  </Td>
                  <Td className="text-right">
                    {a.status === "active" ? (
                      <FormButton type="button" variant="secondary" onClick={() => handleVacate(a)} disabled={vacatingId === a.id}>
                        Vacate
                      </FormButton>
                    ) : "—"}
                  </Td>
                </tr>
              ))}
            </Tbody>
          </TableWrapper>
        )}

        <TableFooter>
          <p className={`text-slate-500 ${bodyTextClassName}`}>
            {meta.total > 0 ? `Showing ${meta.from} to ${meta.to} of ${meta.total}` : "No results"}
          </p>
          <div className="flex items-center gap-3">
            <FormButton type="button" variant="secondary" disabled={meta.current_page <= 1} onClick={() => setPage((c) => c - 1)}>Previous</FormButton>
            <span className={`text-slate-500 ${bodyTextClassName}`}>Page {meta.current_page} of {meta.last_page}</span>
            <FormButton type="button" variant="secondary" disabled={meta.current_page >= meta.last_page} onClick={() => setPage((c) => c + 1)}>Next</FormButton>
          </div>
        </TableFooter>
      </Table>
    </section>
  );
}

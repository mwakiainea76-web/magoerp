import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Trash2, Eye, Building2 } from "lucide-react";
import toast from "react-hot-toast";

import { bodyTextClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td, TableFooter } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { useHostelsApi } from "@/hooks/useHostelsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function HostelsPage() {
  const api = useHostelsApi();
  const [hostels, setHostels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  async function load() {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.list();
      setHostels(res.data ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load hostels."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(hostel) {
    if (!window.confirm(`Delete ${hostel.name}?`)) return;
    setDeletingId(hostel.id);
    try {
      await api.destroy(hostel.id);
      toast.success("Hostel deleted.");
      await load();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to delete."));
    } finally {
      setDeletingId(null);
    }
  }

  const total = hostels.length;
  const lastPage = Math.ceil(total / perPage);
  const paginatedHostels = hostels.slice((page - 1) * perPage, page * perPage);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Hostels</h1>
          <p className="text-[13px] text-slate-500">Manage hostel accommodation facilities</p>
        </div>
        <Link to="/hostels/create">
          <FormButton><Plus className="mr-2 h-4 w-4" />Add Hostel</FormButton>
        </Link>
      </div>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      <Table>
        <TableHeader>
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">Hostel Directory</h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading hostels...</div>
        ) : hostels.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No hostels found.</div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <Th>Name</Th>
                <Th>Code</Th>
                <Th>Gender</Th>
                <Th>Fee</Th>
                <Th className="text-center">Rooms</Th>
                <Th className="text-center">Beds</Th>
                <Th className="text-center">Allocations</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {paginatedHostels.map((h, index) => (
                <tr key={h.id}>
                  <Td className="w-10 text-center text-slate-400">{(page - 1) * perPage + index + 1}</Td>
                  <Td className="font-medium text-slate-800">{h.name}</Td>
                  <Td>{h.code}</Td>
                  <Td className="capitalize">{h.gender ?? "—"}</Td>
                  <Td>{Number(h.session_fee_amount).toLocaleString()}</Td>
                  <Td className="text-center">{h.rooms_count}</Td>
                  <Td className="text-center">{h.beds_count}</Td>
                  <Td className="text-center">{h.active_allocations_count}</Td>
                  <Td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${h.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {h.is_active ? "Active" : "Inactive"}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Link to={`/hostels/${h.id}`} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                        <Eye className="h-3.5 w-3.5" />
                      </Link>
                      <Link to={`/hostels/${h.id}/edit`} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button type="button" onClick={() => handleDelete(h)} disabled={deletingId === h.id}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-60">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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

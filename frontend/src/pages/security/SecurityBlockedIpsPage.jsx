import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td, TableFooter } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { FilterPanel } from "@/components/FilterPanel";
import { bodyTextClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { useSecurityApi } from "@/hooks/useSecurityApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function SecurityBlockedIpsPage() {
  const api = useSecurityApi();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [unblockingId, setUnblockingId] = useState(null);
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const response = await api.listBlockedIps({ page, per_page: perPage, ...filters });
        if (mounted) {
          setItems(response.data ?? []);
          setMeta(response.meta ?? initialMeta);
        }
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load."));
      } finally { if (mounted) setIsLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, [api, page, perPage, filters, reloadKey]);

  async function handleBlock() {
    if (!newIp) return;
    try {
      await api.blockIp({ ip_address: newIp, reason: newReason || null });
      toast.success("IP blocked.");
      setNewIp(""); setNewReason(""); setShowForm(false);
      setReloadKey((k) => k + 1);
    } catch (e) { toast.error(getApiErrorMessage(e, "Failed to block.")); }
  }

  async function handleUnblock(id) {
    if (!confirm("Unblock this IP?")) return;
    setUnblockingId(id);
    try {
      await api.unblockIp(id);
      toast.success("IP unblocked.");
      setReloadKey((k) => k + 1);
    } catch { toast.error("Failed to unblock."); }
    finally { setUnblockingId(null); }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Blocked IPs</h1>
          <p className="text-[13px] text-slate-500">Manage blocked IP addresses.</p>
        </div>
        <FormButton onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1.5 h-4 w-4" /> Block IP
        </FormButton>
      </div>

      {showForm ? (
        <div className="flex items-end gap-3 rounded-xl border border-slate-200/80 bg-white p-4">
          <FormInput label="IP Address" value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="e.g. 192.168.1.1" className="flex-1" />
          <FormInput label="Reason" value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="Optional" className="flex-1" />
          <FormButton onClick={handleBlock}>Block</FormButton>
        </div>
      ) : null}

      <FilterPanel definitions={[{ key: "q", label: "Search IP / reason", type: "text" }]} filters={filters} onChange={setFilters} />

      {error ? <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div> : null}

      <Table>
        <TableHeader><h2>Blocked IPs</h2></TableHeader>
        <TableWrapper>
          <Thead>
            <tr>
              <Th>IP Address</Th>
              <Th>Reason</Th>
              <Th>Duration</Th>
              <Th>Blocked By</Th>
              <Th>Blocked At</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              <tr><Td colSpan={6} className="text-center text-slate-400">Loading...</Td></tr>
            ) : items.length === 0 ? (
              <tr><Td colSpan={6} className="text-center text-slate-400">No blocked IPs.</Td></tr>
            ) : items.map((item) => (
              <tr key={item.id}>
                <Td className="font-mono text-[13px] text-slate-800">{item.ip_address}</Td>
                <Td className="text-slate-600">{item.reason ?? "—"}</Td>
                <Td>{item.is_permanent ? <span className="text-red-600">Permanent</span> : item.blocked_until ? new Date(item.blocked_until).toLocaleDateString() : "—"}</Td>
                <Td className="text-slate-600">{item.created_by ?? "—"}</Td>
                <Td className="text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleString() : "—"}</Td>
                <Td className="text-right">
                  <FormButton variant="secondary" onClick={() => handleUnblock(item.id)} disabled={unblockingId === item.id} className="text-[12px]">
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    {unblockingId === item.id ? "..." : "Unblock"}
                  </FormButton>
                </Td>
              </tr>
            ))}
          </Tbody>
        </TableWrapper>
        <TableFooter>
          <PaginationFooter page={meta.current_page} perPage={meta.per_page} total={meta.total} lastPage={meta.last_page} onPageChange={setPage} onPerPageChange={setPerPage} />
        </TableFooter>
      </Table>
    </section>
  );
}

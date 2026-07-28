import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ban, ExternalLink, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Table, TableHeader, TableWrapper, Thead, Th, SortableTh, Tbody, Td, TableFooter } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { FilterPanel } from "@/components/FilterPanel";
import { Modal } from "@/components/Modal";
import { FormInput } from "@/components/FormInput";
import { bodyTextClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useSecurityApi } from "@/hooks/useSecurityApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function SecurityDevicesPage() {
  const api = useSecurityApi();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [blockingId, setBlockingId] = useState(null);
  const [blockReason, setBlockReason] = useState("");
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState("last_seen_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);

  const FILTER_DEFINITIONS = [
    { key: "q", label: "Search browser/OS/type", type: "text" },
    { key: "device_type", label: "Device Type", type: "text" },
  ];

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const response = await api.listDevices({ sort_by: sortBy, sort_direction: sortDirection, page, per_page: perPage, ...filters });
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
  }, [api, page, perPage, filters, reloadKey, sortBy, sortDirection]);

  async function handleDelete(id) {
    if (!confirm("Remove this device from tracking?")) return;
    setDeletingId(id);
    try {
      await api.deleteDevice(id);
      toast.success("Device removed.");
      setReloadKey((k) => k + 1);
    } catch { toast.error("Failed to remove."); }
    finally { setDeletingId(null); }
  }

  async function handleBlock(id) {
    try {
      await api.blockDevice({ device_id: id, reason: blockReason || null });
      toast.success("Device blocked.");
      setBlockingId(null);
      setBlockReason("");
      setReloadKey((k) => k + 1);
    } catch (e) { toast.error(getApiErrorMessage(e, "Failed to block.")); }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Devices</h1>
          <p className="text-[13px] text-slate-500">Known devices across the system.</p>
        </div>
      </div>

      <FilterPanel definitions={FILTER_DEFINITIONS} filters={filters} onChange={setFilters} />

      {error ? <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div> : null}

      <Table>
        <TableHeader><h2>Devices</h2></TableHeader>
        <TableWrapper>
          <Thead>
            <tr>
              <Th>Browser / OS</Th>
              <Th>Type</Th>
              <Th>User</Th>
              <SortableTh sortKey="risk_score" sortBy={sortBy} sortDirection={sortDirection} onSort={(k, d) => { setSortBy(k); setSortDirection(d); }}>Risk</SortableTh>
              <Th>Trusted</Th>
              <SortableTh sortKey="last_seen_at" sortBy={sortBy} sortDirection={sortDirection} onSort={(k, d) => { setSortBy(k); setSortDirection(d); }}>Last Seen</SortableTh>
              <Th className="text-right">Action</Th>
            </tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              <tr><Td colSpan={7} className="text-center text-slate-400">Loading...</Td></tr>
            ) : items.length === 0 ? (
              <tr><Td colSpan={7} className="text-center text-slate-400">No devices found.</Td></tr>
            ) : items.map((item) => (
              <tr key={item.id}>
                <Td>
                  <div className="text-slate-800">{item.browser ?? "—"}</div>
                  <div className="text-[11px] text-slate-400">{item.operating_system ?? "—"}</div>
                </Td>
                <Td className="capitalize text-slate-600">{item.device_type}</Td>
                <Td>
                  {item.user_id ? (
                    <Link to={`/security/users/${item.user_id}`} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700">
                      {item.user_name} <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : <span className="text-slate-400">Unassigned</span>}
                </Td>
                <Td>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    item.risk_score > 60 ? "bg-red-50 text-red-700" :
                    item.risk_score > 30 ? "bg-amber-50 text-amber-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {item.risk_score}
                  </span>
                </Td>
                <Td>{item.is_trusted ? <span className="text-emerald-600">Yes</span> : <span className="text-slate-400">No</span>}</Td>
                <Td className="text-slate-500">{item.last_seen_at ? new Date(item.last_seen_at).toLocaleString() : "—"}</Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <FormButton variant="secondary" onClick={() => setBlockingId(item.id)} className="text-[12px]">
                      <Ban className="mr-1 h-3.5 w-3.5" />
                      Block
                    </FormButton>
                    <FormButton variant="secondary" onClick={() => handleDelete(item.id)} disabled={deletingId === item.id} className="text-[12px]">
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      {deletingId === item.id ? "..." : "Remove"}
                    </FormButton>
                  </div>
                </Td>
              </tr>
            ))}
          </Tbody>
        </TableWrapper>
        <TableFooter>
          <PaginationFooter page={meta.current_page} perPage={meta.per_page} total={meta.total} lastPage={meta.last_page} onPageChange={setPage} onPerPageChange={setPerPage} />
        </TableFooter>
      </Table>

      {blockingId ? (
        <Modal title="Block Device" onClose={() => { setBlockingId(null); setBlockReason(""); }}>
          <div className="space-y-4">
            <p className="text-[13px] text-slate-600">This device will be blocked from accessing the system.</p>
            <FormInput label="Reason (optional)" value={blockReason} onChange={(e) => setBlockReason(e.target.value)} placeholder="Why is this device being blocked?" />
            <div className="flex justify-end gap-2">
              <FormButton variant="secondary" onClick={() => { setBlockingId(null); setBlockReason(""); }}>Cancel</FormButton>
              <FormButton onClick={() => handleBlock(blockingId)}>Block Device</FormButton>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

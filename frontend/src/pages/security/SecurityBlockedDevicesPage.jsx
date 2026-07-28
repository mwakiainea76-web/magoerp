import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td, TableFooter } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { bodyTextClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { useSecurityApi } from "@/hooks/useSecurityApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function SecurityBlockedDevicesPage() {
  const api = useSecurityApi();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [unblockingId, setUnblockingId] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [newDeviceId, setNewDeviceId] = useState("");
  const [newReason, setNewReason] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const response = await api.listBlockedDevices({ page, per_page: perPage });
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
  }, [api, page, perPage, reloadKey]);

  async function handleBlock() {
    if (!newDeviceId) return;
    try {
      await api.blockDevice({ device_id: newDeviceId, reason: newReason || null });
      toast.success("Device blocked.");
      setNewDeviceId(""); setNewReason(""); setShowForm(false);
      setReloadKey((k) => k + 1);
    } catch (e) { toast.error(getApiErrorMessage(e, "Failed to block.")); }
  }

  async function handleUnblock(id) {
    if (!confirm("Unblock this device?")) return;
    setUnblockingId(id);
    try {
      await api.unblockDevice(id);
      toast.success("Device unblocked.");
      setReloadKey((k) => k + 1);
    } catch { toast.error("Failed to unblock."); }
    finally { setUnblockingId(null); }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Blocked Devices</h1>
          <p className="text-[13px] text-slate-500">Devices that have been blocked from accessing the system.</p>
        </div>
        <FormButton onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1.5 h-4 w-4" /> Block Device
        </FormButton>
      </div>

      {showForm ? (
        <div className="flex items-end gap-3 rounded-xl border border-slate-200/80 bg-white p-4">
          <FormInput label="Device ID" value={newDeviceId} onChange={(e) => setNewDeviceId(e.target.value)} placeholder="Device UUID" className="flex-1" />
          <FormInput label="Reason" value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="Optional" className="flex-1" />
          <FormButton onClick={handleBlock}>Block</FormButton>
        </div>
      ) : null}

      {error ? <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div> : null}

      <Table>
        <TableHeader><h2>Blocked Devices</h2></TableHeader>
        <TableWrapper>
          <Thead>
            <tr>
              <Th>Device UUID</Th>
              <Th>Browser</Th>
              <Th>OS</Th>
              <Th>Reason</Th>
              <Th>Duration</Th>
              <Th>Blocked By</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              <tr><Td colSpan={7} className="text-center text-slate-400">Loading...</Td></tr>
            ) : items.length === 0 ? (
              <tr><Td colSpan={7} className="text-center text-slate-400">No blocked devices.</Td></tr>
            ) : items.map((item) => (
              <tr key={item.id}>
                <Td className="font-mono text-[12px] text-slate-500">{item.device_uuid ? item.device_uuid.slice(0, 8) + "..." : "—"}</Td>
                <Td className="text-slate-700">{item.device_browser ?? "—"}</Td>
                <Td className="text-slate-600">{item.device_os ?? "—"}</Td>
                <Td className="text-slate-600">{item.reason ?? "—"}</Td>
                <Td>{item.is_permanent ? <span className="text-red-600">Permanent</span> : item.blocked_until ? new Date(item.blocked_until).toLocaleDateString() : "—"}</Td>
                <Td className="text-slate-600">{item.created_by ?? "—"}</Td>
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

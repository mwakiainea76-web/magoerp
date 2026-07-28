import { useEffect, useState } from "react";
import { AlertTriangle, ArrowUpRight, CheckCircle2, Eye } from "lucide-react";
import toast from "react-hot-toast";

import { Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td, TableFooter } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { FilterPanel } from "@/components/FilterPanel";
import { Modal } from "@/components/Modal";
import { bodyTextClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { useApiMonitoring } from "@/hooks/useApiMonitoring";
import { getApiErrorMessage } from "@/lib/api/authClient";

const statusBadge = {
  pending: "bg-red-50 text-red-700",
  escalated: "bg-blue-50 text-blue-700",
  resolved: "bg-emerald-50 text-emerald-700",
};

export function ApiMonitoringPage() {
  const api = useApiMonitoring();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);
  const [escalateId, setEscalateId] = useState(null);
  const [escalateNote, setEscalateNote] = useState("");
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);
  const [stats, setStats] = useState(null);

  const FILTER_DEFINITIONS = [
    { key: "q", label: "Search path/error", type: "text" },
    { key: "method", label: "Method", type: "text" },
    { key: "status", label: "Status", type: "select", options: ["", "pending", "escalated", "resolved"] },
  ];

  useEffect(() => {
    api.getStats().then((res) => setStats(res.data)).catch(() => {});
  }, [api, reloadKey]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const response = await api.listErrors({ page, per_page: perPage, ...filters });
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

  async function handleEscalate(id) {
    try {
      await api.escalate(id, { note: escalateNote || null });
      toast.success("Escalated for investigation.");
      setEscalateId(null);
      setEscalateNote("");
      setReloadKey((k) => k + 1);
    } catch (e) { toast.error(getApiErrorMessage(e, "Failed to escalate.")); }
  }

  async function handleResolve(id) {
    if (!confirm("Mark this endpoint error as resolved?")) return;
    try {
      await api.resolve(id);
      toast.success("Error resolved.");
      setReloadKey((k) => k + 1);
    } catch { toast.error("Failed to resolve."); }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">API Error Monitoring</h1>
          <p className="text-[13px] text-slate-500">Track endpoint 500 errors. Flow: Pending → Escalated → Resolved.</p>
        </div>
      </div>

      {stats ? (
        <div className="grid grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200/80 bg-white p-4">
            <div className="text-[12px] text-slate-500">Total Endpoints</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{stats.total_endpoints}</div>
          </div>
          <div className="rounded-xl border border-red-100 bg-red-50 p-4">
            <div className="text-[12px] text-red-600">Pending</div>
            <div className="mt-1 text-2xl font-semibold text-red-700">{stats.pending}</div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="text-[12px] text-blue-600">Escalated</div>
            <div className="mt-1 text-2xl font-semibold text-blue-700">{stats.escalated}</div>
          </div>
          <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="text-[12px] text-emerald-600">Resolved</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-700">{stats.resolved}</div>
          </div>
        </div>
      ) : null}

      {stats?.top_endpoints?.length > 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white p-4">
          <h3 className="mb-2 text-[13px] font-medium text-slate-700">Top Error Endpoints</h3>
          <div className="space-y-1.5">
            {stats.top_endpoints.map((ep, i) => (
              <div key={i} className="flex items-center justify-between text-[12px]">
                <span className="font-mono text-slate-600">
                  <span className="font-medium text-slate-800">{ep.method}</span> {ep.path}
                </span>
                <span className="font-semibold text-red-600">{ep.count} errors</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <FilterPanel definitions={FILTER_DEFINITIONS} filters={filters} onChange={setFilters} />

      {error ? <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div> : null}

      <Table>
        <TableHeader><h2>Endpoint Errors</h2></TableHeader>
        <TableWrapper>
          <Thead>
            <tr>
              <Th>Endpoint</Th>
              <Th>Errors</Th>
              <Th>Last Error</Th>
              <Th>Last Occurred</Th>
              <Th>Status</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              <tr><Td colSpan={6} className="text-center text-slate-400">Loading...</Td></tr>
            ) : items.length === 0 ? (
              <tr><Td colSpan={6} className="text-center text-slate-400">No errors recorded.</Td></tr>
            ) : items.map((item) => (
              <tr key={item.id}>
                <Td>
                  <div className="font-mono text-[12px]">
                    <span className="font-medium text-slate-800">{item.method}</span>
                    <span className="ml-1.5 text-slate-500">{item.path}</span>
                  </div>
                </Td>
                <Td><span className="font-semibold text-red-600">{item.error_count}</span></Td>
                <Td className="max-w-[300px] truncate text-slate-600" title={item.last_error_message ?? ""}>{item.last_error_message ?? "—"}</Td>
                <Td className="text-slate-500 text-nowrap">{item.last_occurred_at ? new Date(item.last_occurred_at).toLocaleString() : "—"}</Td>
                <Td>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge[item.status] ?? "bg-slate-100 text-slate-600"}`}>
                    {item.status}
                  </span>
                </Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <FormButton variant="secondary" onClick={() => setSelectedLog(item)} className="text-[12px]">
                      <Eye className="mr-1 h-3.5 w-3.5" /> View
                    </FormButton>
                    {item.status === "pending" ? (
                      <FormButton variant="secondary" onClick={() => setEscalateId(item.id)} className="text-[12px]">
                        <ArrowUpRight className="mr-1 h-3.5 w-3.5" /> Escalate
                      </FormButton>
                    ) : null}
                    {item.status === "escalated" ? (
                      <FormButton variant="secondary" onClick={() => handleResolve(item.id)} className="text-[12px]">
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Resolve
                      </FormButton>
                    ) : null}
                    {item.status === "resolved" ? (
                      <span className="text-[12px] text-emerald-600">Done</span>
                    ) : null}
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

      {selectedLog ? (
        <Modal title={`${selectedLog.method} ${selectedLog.path}`} onClose={() => setSelectedLog(null)}>
          <div className="space-y-4 text-[13px]">
            <div className="grid grid-cols-2 gap-4">
              <div><span className="text-slate-400">Status</span><p className="font-semibold text-slate-800 capitalize">{selectedLog.status}</p></div>
              <div><span className="text-slate-400">Error Count</span><p className="font-semibold text-red-600">{selectedLog.error_count}</p></div>
              <div className="col-span-2"><span className="text-slate-400">Last Error</span><p className="mt-0.5 font-mono text-red-600 whitespace-pre-wrap">{selectedLog.last_error_message}</p></div>
              <div><span className="text-slate-400">Last IP</span><p className="font-mono text-slate-600">{selectedLog.last_ip ?? "—"}</p></div>
              <div><span className="text-slate-400">Last Occurred</span><p className="text-slate-600">{selectedLog.last_occurred_at ? new Date(selectedLog.last_occurred_at).toLocaleString() : "—"}</p></div>
              <div><span className="text-slate-400">First Occurred</span><p className="text-slate-600">{selectedLog.first_occurred_at ? new Date(selectedLog.first_occurred_at).toLocaleString() : "—"}</p></div>
            </div>
            {selectedLog.escalation_note ? (
              <div><span className="text-slate-400">Escalation Note</span><p className="mt-0.5 text-slate-700">{selectedLog.escalation_note}</p></div>
            ) : null}
            {selectedLog.last_context ? (
              <div>
                <span className="text-slate-400">Context</span>
                <pre className="mt-1 max-h-48 overflow-auto rounded-lg bg-slate-50 p-3 font-mono text-[11px] text-slate-700">{JSON.stringify(selectedLog.last_context, null, 2)}</pre>
              </div>
            ) : null}
          </div>
        </Modal>
      ) : null}

      {escalateId ? (
        <Modal title="Escalate Error" onClose={() => { setEscalateId(null); setEscalateNote(""); }}>
          <div className="space-y-4">
            <p className="text-[13px] text-slate-600">Escalate this endpoint error for investigation.</p>
            <FormInput label="Note (what to check?)" value={escalateNote} onChange={(e) => setEscalateNote(e.target.value)} placeholder="e.g. Check database connection / fix query" />
            <div className="flex justify-end gap-2">
              <FormButton variant="secondary" onClick={() => { setEscalateId(null); setEscalateNote(""); }}>Cancel</FormButton>
              <FormButton onClick={() => handleEscalate(escalateId)}>Escalate</FormButton>
            </div>
          </div>
        </Modal>
      ) : null}
    </section>
  );
}

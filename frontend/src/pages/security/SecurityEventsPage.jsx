import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Ban, CheckCircle2, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

import { Table, TableHeader, TableWrapper, Thead, Th, SortableTh, Tbody, Td, TableFooter } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { FilterPanel } from "@/components/FilterPanel";
import { bodyTextClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useSecurityApi } from "@/hooks/useSecurityApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const severityColors = { low: "bg-slate-400", medium: "bg-amber-400", high: "bg-orange-500", critical: "bg-red-600" };

export function SecurityEventsPage() {
  const api = useSecurityApi();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolvingId, setResolvingId] = useState(null);
  const [blockingIp, setBlockingIp] = useState("");
  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);

  const FILTER_DEFINITIONS = [
    { key: "event_type", label: "Event Type", type: "text" },
    { key: "severity", label: "Severity", type: "text" },
    { key: "date_from", label: "Date From", type: "date" },
    { key: "date_to", label: "Date To", type: "date" },
  ];

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const response = await api.listEvents({ sort_by: sortBy, sort_direction: sortDirection, page, per_page: perPage, ...filters });
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

  async function handleResolve(id) {
    setResolvingId(id);
    try {
      await api.resolveEvent(id);
      toast.success("Event resolved.");
      setReloadKey((k) => k + 1);
    } catch {
      toast.error("Failed to resolve.");
    } finally { setResolvingId(null); }
  }

  async function handleBlockIp(ip) {
    if (!confirm(`Block IP ${ip}?`)) return;
    try {
      await api.blockIp({ ip_address: ip, reason: `Blocked from security event` });
      toast.success(`IP ${ip} blocked.`);
    } catch (e) { toast.error(getApiErrorMessage(e, "Failed to block IP.")); }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Security Events</h1>
          <p className="text-[13px] text-slate-500">All security-related events across the system.</p>
        </div>
      </div>

      <FilterPanel definitions={FILTER_DEFINITIONS} filters={filters} onChange={setFilters} />

      {error ? <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div> : null}

      <Table>
        <TableHeader>
          <h2>Events</h2>
        </TableHeader>
        <TableWrapper>
          <Thead>
            <tr>
              <SortableTh sortKey="event_type" sortBy={sortBy} sortDirection={sortDirection} onSort={(k, d) => { setSortBy(k); setSortDirection(d); }}>Event</SortableTh>
              <SortableTh sortKey="severity" sortBy={sortBy} sortDirection={sortDirection} onSort={(k, d) => { setSortBy(k); setSortDirection(d); }}>Severity</SortableTh>
              <Th>User</Th>
              <Th>IP Address</Th>
              <SortableTh sortKey="created_at" sortBy={sortBy} sortDirection={sortDirection} onSort={(k, d) => { setSortBy(k); setSortDirection(d); }}>Time</SortableTh>
              <Th>Status</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </Thead>
          <Tbody>
            {isLoading ? (
              <tr><Td colSpan={7} className="text-center text-slate-400">Loading...</Td></tr>
            ) : items.length === 0 ? (
              <tr><Td colSpan={7} className="text-center text-slate-400">No events found.</Td></tr>
            ) : items.map((item) => (
              <tr key={item.id}>
                <Td className="capitalize">{item.event_type.replace(/_/g, " ")}</Td>
                <Td>
                  <span className={`inline-block h-2 w-2 rounded-full ${severityColors[item.severity] ?? "bg-slate-400"}`} />
                  <span className="ml-1.5 capitalize text-slate-600">{item.severity}</span>
                  {item.risk_points > 0 ? <span className="ml-2 text-[11px] text-slate-400">(+{item.risk_points})</span> : null}
                </Td>
                <Td>
                  {item.user_id ? (
                    <Link to={`/security/users/${item.user_id}`} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700">
                      {item.user_name} <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : <span className="text-slate-400">System</span>}
                </Td>
                <Td className="font-mono text-[12px]">{item.ip_address ?? "—"}</Td>
                <Td className="text-slate-500">{item.created_at ? new Date(item.created_at).toLocaleString() : "—"}</Td>
                <Td>
                  {item.resolved ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">Resolved</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Open</span>
                  )}
                </Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {item.ip_address ? (
                      <FormButton variant="secondary" onClick={() => handleBlockIp(item.ip_address)} className="text-[12px]">
                        <Ban className="mr-1 h-3.5 w-3.5" />
                        Block IP
                      </FormButton>
                    ) : null}
                    {!item.resolved ? (
                      <FormButton variant="secondary" onClick={() => handleResolve(item.id)} disabled={resolvingId === item.id} className="text-[12px]">
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        {resolvingId === item.id ? "..." : "Resolve"}
                      </FormButton>
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
    </section>
  );
}

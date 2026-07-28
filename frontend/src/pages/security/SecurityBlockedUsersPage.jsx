import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td, TableFooter } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { bodyTextClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useSecurityApi } from "@/hooks/useSecurityApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function SecurityBlockedUsersPage() {
  const api = useSecurityApi();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [unblockingId, setUnblockingId] = useState(null);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const response = await api.listBlockedUsers({ page, per_page: perPage });
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

  async function handleUnblock(id) {
    if (!confirm("Unblock this user?")) return;
    setUnblockingId(id);
    try {
      await api.unblockUser(id);
      toast.success("User unblocked.");
      setReloadKey((k) => k + 1);
    } catch { toast.error("Failed to unblock."); }
    finally { setUnblockingId(null); }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Blocked Users</h1>
        <p className="text-[13px] text-slate-500">Users blocked from accessing the system.</p>
      </div>

      {error ? <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div> : null}

      <Table>
        <TableHeader><h2>Blocked Users</h2></TableHeader>
        <TableWrapper>
          <Thead>
            <tr>
              <Th>User</Th>
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
              <tr><Td colSpan={6} className="text-center text-slate-400">No blocked users.</Td></tr>
            ) : items.map((item) => (
              <tr key={item.id}>
                <Td>
                  <Link to={`/security/users/${item.user_id}`} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700">
                    {item.user_name} <ExternalLink className="h-3 w-3" />
                  </Link>
                </Td>
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

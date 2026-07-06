import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Table, TableHeader, TableWrapper, Thead, Th, SortableTh, Tbody, Td, TableFooter } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { bodyTextClassName, labelTextClassName, selectClassName, inputClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useUnitsApi } from "@/hooks/useUnitsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

export function UnitsPage() {
  const unitsApi = useUnitsApi();

  const [units, setUnits] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    let isMounted = true;

    async function loadUnits() {
      setIsLoading(true);
      setError("");

      try {
        const response = await unitsApi.list({
          q: query,
          status,
          sort_by: sortBy,
          sort_direction: sortDirection,
          page,
          per_page: perPage,
        });

        if (isMounted) {
          setUnits(response.data ?? []);
          setMeta(response.meta ?? initialMeta);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, "Server error."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadUnits();

    return () => {
      isMounted = false;
    };
  }, [unitsApi, page, perPage, query, reloadKey, sortBy, sortDirection, status]);

  async function handleDelete(unit) {
    const confirmed = window.confirm(`Delete ${unit.name}?`);
    if (!confirmed) return;

    setDeletingId(unit.id);
    setError("");

    try {
      await unitsApi.remove(unit.id);
      toast.success("Unit deleted successfully.");
      setReloadKey((current) => current + 1);
    } catch (deleteError) {
      setError(getApiErrorMessage(deleteError, "Server error."));
    } finally {
      setDeletingId(null);
    }
  }

  function handleSort(field, direction) {
    setSortBy(field);
    setSortDirection(direction);
    setPage(1);
  }

  function handleFilterSubmit(event) {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  }

  function handleResetFilters() {
    setSearchInput("");
    setQuery("");
    setStatus("all");
    setSortBy("created_at");
    setSortDirection("desc");
    setPerPage(10);
    setPage(1);
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Units</h1>
          <p className="text-[13px] text-slate-500">Manage units within course curriculum versions</p>
        </div>

        <Link to="/admin/units/create">
          <FormButton className="sm:px-5">
            <Plus className="mr-2 h-4 w-4" />
            Add Unit
          </FormButton>
        </Link>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className="rounded-xl border border-slate-200/80 bg-white p-5"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.7fr)_auto] xl:items-end">
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Search</label>
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className={inputClassName}
              placeholder="Search by code, name, or description"
            />
          </div>
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Status</label>
            <select
              value={status}
              onChange={(event) => { setStatus(event.target.value); setPage(1); }}
              className={`${selectClassName} w-full`}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex gap-3 xl:justify-end">
            <FormButton type="submit" className="w-full sm:w-auto">Apply</FormButton>
            <FormButton type="button" variant="secondary" className="w-full sm:w-auto" onClick={handleResetFilters}>Reset</FormButton>
          </div>
        </div>
      </form>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      <Table>
        <TableHeader>
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">Unit Directory</h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading units...</div>
        ) : units.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No units found for the current filters.</div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <SortableTh sortKey="code" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Code</SortableTh>
                <SortableTh sortKey="name" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Name</SortableTh>
                <Th>Course</Th>
                <Th>Version</Th>
                <Th>Level</Th>
                <Th>Modules</Th>
                <Th>Hours</Th>
                <Th>Credit Factor</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {units.map((unit, index) => (
                <tr key={unit.id}>
                  <Td className="w-10 text-center text-slate-400">
                    {(meta.current_page - 1) * meta.per_page + index + 1}
                  </Td>
                  <Td>{unit.code}</Td>
                  <Td>{unit.name}</Td>
                  <Td>{unit.course_code} {unit.course_name}</Td>
                  <Td>{unit.curriculum_code}</Td>
                  <Td>{unit.certification_level_name}</Td>
                  <Td>{unit.modules_taught ?? "—"}</Td>
                  <Td>{unit.taught_hours ?? "—"}</Td>
                  <Td>{unit.credit_factor ?? "—"}</Td>
                  <Td><StatusBadge active={unit.is_active} /></Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/admin/units/${unit.id}/edit`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(unit)}
                        disabled={deletingId === unit.id}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
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
          <PaginationFooter page={page} perPage={perPage} total={meta.total} lastPage={meta.last_page} onPageChange={setPage} onPerPageChange={setPerPage} />
        </TableFooter>
      </Table>
    </section>
  );
}
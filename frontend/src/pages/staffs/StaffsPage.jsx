import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import {
  Table,
  TableHeader,
  TableWrapper,
  Thead,
  Th,
  SortableTh,
  Tbody,
  Td,
  TableFooter,
} from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { bodyTextClassName, labelTextClassName, selectClassName, inputClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useStaffsApi } from "@/hooks/useStaffsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function StaffsPage() {
  const staffsApi = useStaffsApi();
  const [staffs, setStaffs] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    let isMounted = true;

    async function loadStaffs() {
      setIsLoading(true);
      setError("");

      try {
        const response = await staffsApi.list({
          q: query,
          sort_by: sortBy,
          sort_direction: sortDirection,
          page,
          per_page: perPage,
        });

        if (isMounted) {
          setStaffs(response.data ?? []);
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

    loadStaffs();

    return () => {
      isMounted = false;
    };
  }, [staffsApi, page, perPage, query, reloadKey, sortBy, sortDirection]);

  async function handleDelete(staff) {
    const confirmed = window.confirm(`Delete ${staff.employee_number} (${staff.full_name})?`);

    if (!confirmed) {
      return;
    }

    setDeletingId(staff.id);
    setError("");

    try {
      await staffsApi.remove(staff.id);
      toast.success("Staff member deleted successfully.");
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
    setSortBy("created_at");
    setSortDirection("desc");
    setPerPage(10);
    setPage(1);
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
            Staff Directory
          </h1>
          <p className="text-[13px] text-slate-500">
            Manage all staff members
          </p>
        </div>

        <Link to="/staffs/create">
          <FormButton className="w-full sm:w-auto sm:px-5">
            <Plus className="mr-2 h-4 w-4" />
            Add Staff
          </FormButton>
        </Link>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className="rounded-xl border border-slate-200/80 bg-white p-5"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_auto] xl:items-end">
          <div>
            <label
              className={`mb-2 block text-slate-600 ${labelTextClassName}`}
            >
              Search
            </label>
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className={inputClassName}
              placeholder="Search by employee #, name, or job title"
            />
          </div>

          <div className="flex gap-3 xl:justify-end">
            <FormButton type="submit" className="w-full sm:w-auto">
              Apply
            </FormButton>
            <FormButton
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={handleResetFilters}
            >
              Reset
            </FormButton>
          </div>
        </div>
      </form>

      {error ? (
        <div
          className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}
        >
          {error}
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">
            All Staff
          </h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>
            Loading staff...
          </div>
        ) : staffs.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>
            No staff found for the current filters.
          </div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <SortableTh sortKey="employee_number" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Employee #</SortableTh>
                <SortableTh sortKey="first_name" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Full Name</SortableTh>
                <SortableTh sortKey="job_title" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Job Title</SortableTh>
                <Th>Department</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {staffs.map((staff, index) => (
                <tr key={staff.id}>
                  <Td className="w-10 text-center text-slate-400">
                    {(meta.current_page - 1) * meta.per_page + index + 1}
                  </Td>
                  <Td>{staff.employee_number}</Td>
                  <Td>{staff.full_name}</Td>
                  <Td>{staff.job_title}</Td>
                  <Td>{staff.department_name || "Unassigned"}</Td>
                  <Td>{staff.employment_type}</Td>
                  <Td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      staff.status
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}>
                      {staff.status ? "Active" : "Inactive"}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/staffs/${staff.id}/edit`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(staff)}
                        disabled={deletingId === staff.id}
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

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
import { bodyTextClassName, labelTextClassName, selectClassName, inputClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useStudentsApi } from "@/hooks/useStudentsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function StudentsPage() {
  const studentsApi = useStudentsApi();
  const [students, setStudents] = useState([]);
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

    async function loadStudents() {
      setIsLoading(true);
      setError("");

      try {
        const response = await studentsApi.list({
          q: query,
          sort_by: sortBy,
          sort_direction: sortDirection,
          page,
          per_page: perPage,
        });

        if (isMounted) {
          setStudents(response.data ?? []);
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

    loadStudents();

    return () => {
      isMounted = false;
    };
  }, [studentsApi, page, perPage, query, reloadKey, sortBy, sortDirection]);

  async function handleDelete(student) {
    const confirmed = window.confirm(`Delete ${student.admission_number} (${student.full_name})?`);
    if (!confirmed) return;

    setDeletingId(student.id);
    setError("");

    try {
      await studentsApi.remove(student.id);
      toast.success("Student deleted successfully.");
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
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Student Registry</h1>
          <p className="text-[13px] text-slate-500">Manage all students</p>
        </div>

        <Link to="/students/create">
          <FormButton className="w-full sm:w-auto sm:px-5">
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </FormButton>
        </Link>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className="rounded-xl border border-slate-200/80 bg-white p-5"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_auto] xl:items-end">
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Search</label>
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className={inputClassName}
              placeholder="Search by admission #, name, or course"
            />
          </div>

          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Per Page</label>
            <select
              value={perPage}
              onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }}
              className={`${selectClassName} w-full`}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
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
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">All Students</h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading students...</div>
        ) : students.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No students found for the current filters.</div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <SortableTh sortKey="admission_number" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Admission #</SortableTh>
                <SortableTh sortKey="first_name" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Full Name</SortableTh>
                <Th>Course</Th>
                <Th>Enrollment Date</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {students.map((student, index) => (
                <tr key={student.id}>
                  <Td className="w-10 text-center text-slate-400">
                    {(meta.current_page - 1) * meta.per_page + index + 1}
                  </Td>
                  <Td>{student.admission_number}</Td>
                  <Td>{student.full_name}</Td>
                  <Td>{student.course_name || "—"}</Td>
                  <Td>{student.enrollment_date ?? "—"}</Td>
                  <Td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      student.status
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}>
                      {student.status ? "Active" : "Inactive"}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/students/${student.id}/edit`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(student)}
                        disabled={deletingId === student.id}
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
          <p className={`text-slate-500 ${bodyTextClassName}`}>
            {meta.total > 0
              ? `Showing ${meta.from} to ${meta.to} of ${meta.total} students`
              : "No results"}
          </p>
          <div className="flex items-center gap-3">
            <FormButton
              type="button"
              variant="secondary"
              className="h-9 w-auto px-4"
              disabled={meta.current_page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >Previous</FormButton>
            <span className={`text-slate-500 ${bodyTextClassName}`}>Page {meta.current_page} of {meta.last_page}</span>
            <FormButton
              type="button"
              variant="secondary"
              className="h-9 w-auto px-4"
              disabled={meta.current_page >= meta.last_page || isLoading}
              onClick={() => setPage((current) => current + 1)}
            >Next</FormButton>
          </div>
        </TableFooter>
      </Table>
    </section>
  );
}

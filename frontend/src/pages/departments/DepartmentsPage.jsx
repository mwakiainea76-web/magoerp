import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
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
import { LookupSelect } from "@/components/LookupSelect";
import { bodyTextClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useDepartmentsApi } from "@/hooks/useDepartmentsApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function DepartmentsPage() {
  const departmentsApi = useDepartmentsApi();
  const lookupApi = useLookupApi();
  const [departments, setDepartments] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  useEffect(() => {
    let isMounted = true;

    async function loadDepartments() {
      setIsLoading(true);
      setError("");

      try {
        const response = await departmentsApi.list({
          q: query,
          sort_by: sortBy,
          sort_direction: sortDirection,
          page,
          per_page: perPage,
        });

        if (isMounted) {
          setDepartments(response.data ?? []);
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

    loadDepartments();

    return () => {
      isMounted = false;
    };
  }, [departmentsApi, page, perPage, reloadKey, sortBy, sortDirection]);

  async function handleDelete(department) {
    const confirmed = window.confirm(`Delete ${department.name}?`);

    if (!confirmed) {
      return;
    }

    setDeletingId(department.id);
    setError("");

    try {
      await departmentsApi.remove(department.id);
      toast.success("Department deleted successfully.");
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

  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState("csv");
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleExport(format) {
    setExporting(true);
    setShowExportMenu(false);
    setExportFormat(format);

    try {
      const response = await departmentsApi.exportDepartments({ format });

      const disposition = response.headers?.["content-disposition"] ?? "";
      const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const regularMatch = disposition.match(/filename="?([^";]+)"?/i);
      const filename = encodedMatch
        ? decodeURIComponent(encodedMatch[1])
        : regularMatch?.[1] ?? `departments.${format}`;

      const url = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Export failed."));
    } finally {
      setExporting(false);
    }
  }

  async function fetchDepartmentOptions(queryText) {
    const response = await lookupApi.search("departments", {
      query: queryText,
      limit: 5,
    });

    return response.data ?? [];
  }

  function handleFilterSubmit(event) {
    event.preventDefault();
    setPage(1);
    setQuery(selectedDepartment?.label?.trim() ?? "");
  }

  function handleResetFilters() {
    setSelectedDepartment(null);
    setQuery("");
    setSortBy("created_at");
    setSortDirection("desc");
    setPerPage(10);
    setPage(1);
  }

  const exportLabels = { csv: "CSV", xlsx: "Excel", pdf: "PDF" };

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
            Departments
          </h1>
          <p className="text-[13px] text-slate-500">
            Manage institutional departments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative" ref={exportRef}>
            <div className="flex">
              <FormButton
                type="button"
                variant="secondary"
                disabled={exporting}
                onClick={() => handleExport(exportFormat)}
                className="rounded-r-none border-r-0 sm:px-4"
              >
                <Download className="mr-2 h-4 w-4" />
                {exporting ? "Exporting..." : `Export ${exportLabels[exportFormat]}`}
              </FormButton>
              <FormButton
                type="button"
                variant="secondary"
                disabled={exporting}
                onClick={() => setShowExportMenu((prev) => !prev)}
                aria-label="Choose export format"
                aria-expanded={showExportMenu}
                className="rounded-l-none border-l border-slate-200 px-2 sm:px-2"
                style={{ minWidth: 0 }}
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </FormButton>
            </div>

            {showExportMenu && (
              <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
                {[
                  { value: "csv", label: "CSV (.csv)" },
                  { value: "xlsx", label: "Excel (.xlsx)" },
                  { value: "pdf", label: "PDF (.pdf)" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={exporting}
                    onClick={() => handleExport(opt.value)}
                    className={`flex w-full px-4 py-2.5 text-left text-[14px] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${
                      exportFormat === opt.value
                        ? "bg-emerald-50 font-medium text-emerald-700"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link to="/departments/create">
            <FormButton className="w-full sm:w-auto sm:px-5">
              <Plus className="mr-2 h-4 w-4" />
              Add Department
            </FormButton>
          </Link>
        </div>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className="rounded-xl border border-slate-200/80 bg-white p-5"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_auto] xl:items-end">
          <LookupSelect
            label="Search"
            value={selectedDepartment?.id ?? ""}
            selectedOption={selectedDepartment}
            onChange={(_, option) => setSelectedDepartment(option)}
            fetchOptions={fetchDepartmentOptions}
            placeholder="Search by department code or name"
            emptyMessage="No department found."
          />

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
            Department Directory
          </h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>
            Loading departments...
          </div>
        ) : departments.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>
            No departments found.
          </div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <SortableTh sortKey="code" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Code</SortableTh>
                <SortableTh sortKey="name" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Name</SortableTh>
                <Th>Head of Department</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {departments.map((department, index) => (
                <tr key={department.id}>
                  <Td className="w-10 text-center text-slate-400">
                    {(meta.current_page - 1) * meta.per_page + index + 1}
                  </Td>
                  <Td>{department.code}</Td>
                  <Td>{department.name}</Td>
                  <Td>
                    {department.head_of_department_name
                      ? `${department.head_of_department_name}${department.head_of_department_employee_number ? ` (${department.head_of_department_employee_number})` : ""}`
                      : "Not assigned"}
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/departments/${department.id}/edit`}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(department)}
                        disabled={deletingId === department.id}
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

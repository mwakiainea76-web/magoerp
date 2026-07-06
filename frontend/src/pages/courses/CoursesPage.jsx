import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

import { Table, TableHeader, TableWrapper, Thead, Th, SortableTh, Tbody, Td, TableFooter } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { bodyTextClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { FilterPanel } from "@/components/FilterPanel";
import { useCoursesApi } from "@/hooks/useCoursesApi";
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

const FILTER_DEFINITIONS = [
  {
    key: "q",
    label: "Search",
    type: "text",
    placeholder: "Search by code, initials, name, or description",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    placeholder: "All",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
];

export function CoursesPage() {
  const coursesApi = useCoursesApi();

  const [courses, setCourses] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [exporting, setExporting] = useState(false);
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

  useEffect(() => {
    let isMounted = true;

    async function loadCourses() {
      setIsLoading(true);
      setError("");

      try {
        const params = { sort_by: sortBy, sort_direction: sortDirection, page, per_page: perPage };
        for (const [k, v] of Object.entries(filters)) {
          if (v !== "" && v !== null && v !== undefined) params[k] = v;
        }

        const response = await coursesApi.list(params);

        if (isMounted) {
          setCourses(response.data ?? []);
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

    loadCourses();

    return () => { isMounted = false; };
  }, [coursesApi, page, perPage, filters, reloadKey, sortBy, sortDirection]);

  async function handleDelete(course) {
    const confirmed = window.confirm(`Delete ${course.name}?`);
    if (!confirmed) return;

    setDeletingId(course.id);
    setError("");

    try {
      await coursesApi.remove(course.id);
      toast.success("Course deleted successfully.");
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

  function handleApplyFilter(values) { setPage(1); setFilters(values); }
  function handleResetFilters() { setPage(1); setFilters({}); setSortBy("created_at"); setSortDirection("desc"); setPerPage(10); }

  async function handleExport(format) {
    setExporting(true);
    setShowExportMenu(false);

    try {
      const params = { format, sort_by: sortBy, sort_direction: sortDirection };
      for (const [k, v] of Object.entries(filters)) {
        if (v !== "" && v !== null && v !== undefined) params[k] = v;
      }

      const response = await coursesApi.exportCourses(params);

      const disposition = response.headers?.["content-disposition"] ?? "";
      const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const regularMatch = disposition.match(/filename="?([^";]+)"?/i);
      const filename = encodedMatch ? decodeURIComponent(encodedMatch[1]) : regularMatch?.[1] ?? `courses.${format}`;

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

  const exportOptions = [
    { value: "csv", label: "CSV (.csv)" },
    { value: "xlsx", label: "Excel (.xlsx)" },
    { value: "pdf", label: "PDF (.pdf)" },
  ];
  const [exportFormat, setExportFormat] = useState("csv");

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Courses</h1>
          <p className="text-[13px] text-slate-500">Manage course catalog and curriculum versions</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative" ref={exportRef}>
            <div className="flex">
              <FormButton type="button" variant="secondary" disabled={exporting} onClick={() => handleExport(exportFormat)} className="rounded-r-none border-r-0 sm:px-4">
                <Download className="mr-2 h-4 w-4" />{exporting ? "Exporting..." : `Export ${exportFormat.toUpperCase()}`}
              </FormButton>
              <FormButton type="button" variant="secondary" disabled={exporting} onClick={() => setShowExportMenu((prev) => !prev)} aria-label="Choose export format" aria-expanded={showExportMenu} className="rounded-l-none border-l border-slate-200 px-2 sm:px-2" style={{ minWidth: 0 }}>
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </FormButton>
            </div>
            {showExportMenu && (
              <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
                {exportOptions.map((opt) => (
                  <button key={opt.value} type="button" disabled={exporting} onClick={() => { setExportFormat(opt.value); handleExport(opt.value); }}
                    className={`flex w-full px-4 py-2.5 text-left text-[14px] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${exportFormat === opt.value ? "bg-emerald-50 font-medium text-emerald-700" : "text-slate-600 hover:text-slate-900"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Link to="/admin/courses/create">
            <FormButton className="sm:px-5"><Plus className="mr-2 h-4 w-4" />Add Course</FormButton>
          </Link>
        </div>
      </div>

      <FilterPanel
        definitions={FILTER_DEFINITIONS}
        initialValues={filters}
        onApply={handleApplyFilter}
        onReset={handleResetFilters}
        quickKeys={["q", "status"]}
      />

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      <Table>
        <TableHeader>
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">Course Directory</h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No courses found for the current filters.</div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <SortableTh sortKey="initials" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Initials</SortableTh>
                <SortableTh sortKey="code" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Code</SortableTh>
                <SortableTh sortKey="name" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Name</SortableTh>
                <Th>Authority</Th>
                <Th>Level</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {courses.map((course, index) => (
                <tr key={course.id}>
                  <Td className="w-10 text-center text-slate-400">{(meta.current_page - 1) * meta.per_page + index + 1}</Td>
                  <Td>{course.initials}</Td>
                  <Td>{course.code}</Td>
                  <Td>{course.name}</Td>
                  <Td>{course.certification_authority_name}</Td>
                  <Td>{course.certification_level_name}</Td>
                  <Td><StatusBadge active={course.is_active} /></Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Link to={`/admin/courses/${course.id}/edit`} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"><Pencil className="h-3.5 w-3.5" /></Link>
                      <button type="button" onClick={() => handleDelete(course)} disabled={deletingId === course.id} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"><Trash2 className="h-3.5 w-3.5" /></button>
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

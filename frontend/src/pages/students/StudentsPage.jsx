import { useCallback, useEffect, useRef, useState } from "react";
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
import { bodyTextClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { FilterPanel } from "@/components/FilterPanel";
import { useStudentsApi } from "@/hooks/useStudentsApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function StudentsPage() {
  const studentsApi = useStudentsApi();
  const lookupApi = useLookupApi();
  const [students, setStudents] = useState([]);
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

  const fetchCourses = useCallback(
    async (q, limit) => {
      const res = await lookupApi.search("courses", { query: q, limit });
      return res.data ?? [];
    },
    [lookupApi],
  );

  const fetchCurricula = useCallback(
    async (q, limit) => {
      const res = await lookupApi.search("curricula", {
        query: q,
        limit,
        course_id: filters.course_id || undefined,
      });
      return res.data ?? [];
    },
    [lookupApi, filters.course_id],
  );

  const fetchLevels = useCallback(
    async (q, limit) => {
      const res = await lookupApi.search("certification-levels", { query: q, limit });
      return res.data ?? [];
    },
    [lookupApi],
  );

  const fetchExamBodies = useCallback(
    async (q, limit) => {
      const res = await lookupApi.search("certification-authorities", { query: q, limit });
      return res.data ?? [];
    },
    [lookupApi],
  );

  const FILTER_DEFINITIONS = [
    {
      key: "admission_number",
      label: "Admission number",
      type: "text",
      placeholder: "Enter admission number",
      className: "xl:col-span-4",
    },
    {
      key: "course_id",
      label: "Course",
      type: "search",
      fetchOptions: fetchCourses,
      placeholder: "All courses",
      clears: ["curriculum_id"],
      className: "xl:col-span-3",
    },
    {
      key: "curriculum_id",
      label: "Curriculum",
      type: "search",
      fetchOptions: fetchCurricula,
      placeholder: "All curricula",
      dependsOn: "course_id",
      disabledPlaceholder: "Select course first",
      className: "xl:col-span-4",
    },
    {
      key: "exam_body_id",
      label: "Exam body",
      type: "search",
      fetchOptions: fetchExamBodies,
      placeholder: "All exam bodies",
      className: "xl:col-span-4",
    },
    {
      key: "level_id",
      label: "Level",
      type: "search",
      fetchOptions: fetchLevels,
      placeholder: "All levels",
      className: "xl:col-span-3",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      placeholder: "All statuses",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
        { value: "cleared", label: "Cleared" },
        { value: "graduated", label: "Graduated" },
      ],
      className: "xl:col-span-2",
    },
    {
      key: "gender",
      label: "Gender",
      type: "select",
      placeholder: "All genders",
      options: [
        { value: "male", label: "Male" },
        { value: "female", label: "Female" },
      ],
      className: "xl:col-span-4",
    },
  ];

  useEffect(() => {
    let isMounted = true;

    async function loadStudents() {
      setIsLoading(true);
      setError("");

      try {
        const params = {
          sort_by: sortBy,
          sort_direction: sortDirection,
          page,
          per_page: perPage,
        };

        for (const [k, v] of Object.entries(filters)) {
          if (v !== "" && v !== null && v !== undefined) {
            params[k] = v;
          }
        }

        const response = await studentsApi.list(params);

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
  }, [studentsApi, page, perPage, filters, reloadKey, sortBy, sortDirection]);

  function handleApplyFilter(values) {
    setPage(1);
    setFilters(values);
  }

  function handleResetFilters() {
    setPage(1);
    setFilters({});
    setSortBy("created_at");
    setSortDirection("desc");
    setPerPage(10);
  }

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
      const params = { format, sort_by: sortBy, sort_direction: sortDirection };

      for (const [k, v] of Object.entries(filters)) {
        if (v !== "" && v !== null && v !== undefined) {
          params[k] = v;
        }
      }

      const response = await studentsApi.exportStudents(params);

      const disposition = response.headers?.["content-disposition"] ?? "";
      const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const regularMatch = disposition.match(/filename="?([^";]+)"?/i);
      const filename = encodedMatch
        ? decodeURIComponent(encodedMatch[1])
        : regularMatch?.[1] ?? `students.${format}`;

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

  const exportLabels = { csv: "CSV", xlsx: "Excel", pdf: "PDF" };
  const quickKeys = ["admission_number", "course_id", "level_id", "status"];

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Student Registry</h1>
          <p className="text-[13px] text-slate-500">Manage all students</p>
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

          <Link to="/students/create">
            <FormButton className="w-full sm:w-auto sm:px-5">
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </FormButton>
          </Link>
        </div>
      </div>

      <FilterPanel
        definitions={FILTER_DEFINITIONS}
        initialValues={filters}
        onApply={handleApplyFilter}
        onReset={handleResetFilters}
        quickKeys={quickKeys}
      />

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
                <SortableTh sortKey="admission_number" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Admission number</SortableTh>
                <SortableTh sortKey="first_name" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Name</SortableTh>
                <Th>Course</Th>
                <Th>Level</Th>
                <Th>Curriculum</Th>
                <Th>Status</Th>
                <Th>Gender</Th>
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
                  <Td>{student.course_name || "-"}</Td>
                  <Td>{student.level_name || "-"}</Td>
                  <Td>{student.curriculum_name || "-"}</Td>
                  <Td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      student.status === "inactive"
                        ? "bg-red-50 text-red-700"
                        : student.status === "graduated"
                          ? "bg-violet-50 text-violet-700"
                          : student.status === "cleared"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-emerald-50 text-emerald-700"
                    }`}>
                      {student.status ? student.status.charAt(0).toUpperCase() + student.status.slice(1) : "-"}
                    </span>
                  </Td>
                  <Td className="capitalize">{student.gender || "-"}</Td>
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
          <PaginationFooter page={page} perPage={perPage} total={meta.total} lastPage={meta.last_page} onPageChange={setPage} onPerPageChange={setPerPage} />
        </TableFooter>
      </Table>
    </section>
  );
}

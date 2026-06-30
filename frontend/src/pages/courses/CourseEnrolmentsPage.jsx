import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useForm } from "react-hook-form";
import { Download, ChevronDown, ChevronUp, FileText } from "lucide-react";
import toast from "react-hot-toast";
import * as yup from "yup";

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
import { FormButton } from "@/components/FormButton";
import { FilterPanel } from "@/components/FilterPanel";
import { LookupSelect } from "@/components/LookupSelect";
import { useCourseEnrolmentsApi } from "@/hooks/useCourseEnrolmentsApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { bodyTextClassName, labelClassName, selectClassName, inputClassName, initialMeta } from "@/lib/styles";
import { getApiErrorMessage } from "@/lib/api/authClient";

const statusOptions = ["enrolled", "deferred", "expelled", "transferred", "completed", "withdrawn"];
const statusColors = {
  enrolled: "bg-emerald-50 text-emerald-700",
  deferred: "bg-amber-50 text-amber-700",
  expelled: "bg-red-50 text-red-700",
  transferred: "bg-blue-50 text-blue-700",
  completed: "bg-violet-50 text-violet-700",
  withdrawn: "bg-slate-100 text-slate-600",
};

const statusSchema = yup.object({
  status: yup.string().required("Status is required"),
  course_id: yup.string().when("status", {
    is: "transferred",
    then: (schema) => schema.required("Transfer course is required"),
    otherwise: (schema) => schema.nullable(),
  }),
  remarks: yup.string().nullable(),
});

const FILTER_DEFINITIONS = [
  {
    key: "q",
    label: "Search",
    type: "text",
    placeholder: "Search by student name, admission #, or course",
  },
  {
    key: "status",
    label: "Status",
    type: "select",
    placeholder: "All Statuses",
    options: statusOptions.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
  },
];

export function CourseEnrolmentsPage() {
  const api = useCourseEnrolmentsApi();
  const lookupApi = useLookupApi();

  const [enrolments, setEnrolments] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [filters, setFilters] = useState({});
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Status update modal
  const [selectedEnrolment, setSelectedEnrolment] = useState(null);
  const [transferCourseOption, setTransferCourseOption] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setError: setModalError,
    formState: { errors: modalErrors },
  } = useForm({
    resolver: yupResolver(statusSchema),
    defaultValues: { status: "", course_id: "", remarks: "" },
  });

  const watchedStatus = watch("status");

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const params = { sort_by: sortBy, sort_direction: sortDirection, page, per_page: perPage };
        for (const [k, v] of Object.entries(filters)) {
          if (v !== "" && v !== null && v !== undefined) params[k] = v;
        }

        const response = await api.list(params);

        if (isMounted) {
          setEnrolments(response.data ?? []);
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

    load();

    return () => { isMounted = false; };
  }, [api, page, perPage, filters, reloadKey, sortBy, sortDirection]);

  function handleSort(field, direction) {
    setSortBy(field);
    setSortDirection(direction);
    setPage(1);
  }

  function handleApplyFilter(values) { setPage(1); setFilters(values); }
  function handleResetFilters() { setPage(1); setFilters({}); setSortBy("created_at"); setSortDirection("desc"); setPerPage(10); }

  function openStatusModal(enrolment) {
    setSelectedEnrolment(enrolment);
    setTransferCourseOption(null);
    reset({ status: enrolment.status, course_id: "", remarks: enrolment.remarks ?? "" });
  }

  function closeStatusModal() {
    setSelectedEnrolment(null);
    setTransferCourseOption(null);
    reset({ status: "", course_id: "", remarks: "" });
  }

  async function onSubmitStatus(data) {
    if (!selectedEnrolment) return;

    setIsUpdating(true);
    try {
      const payload = { status: data.status, remarks: data.remarks };
      if (data.status === "transferred" && data.course_id) {
        payload.course_id = data.course_id;
      }

      await api.updateStatus(selectedEnrolment.id, payload);
      toast.success(`Enrolment status changed to "${data.status}".`);
      closeStatusModal();
      setReloadKey((k) => k + 1);
    } catch (err) {
      const serverErrors = err?.response?.data?.errors;
      if (serverErrors) {
        Object.entries(serverErrors).forEach(([key, value]) => {
          setModalError(key, { message: value?.[0] ?? "Invalid value" });
        });
      } else {
        toast.error(getApiErrorMessage(err, "Failed to update status."));
      }
    } finally {
      setIsUpdating(false);
    }
  }

  async function fetchCourseOptions(query) {
    const response = await lookupApi.search("courses", { query, limit: 5 });
    return response.data ?? [];
  }

  async function handleExport(format) {
    setExporting(true);
    setShowExportMenu(false);

    try {
      const params = { format, sort_by: sortBy, sort_direction: sortDirection };
      for (const [k, v] of Object.entries(filters)) {
        if (v !== "" && v !== null && v !== undefined) params[k] = v;
      }

      const response = await api.exportEnrolments(params);

      const disposition = response.headers?.["content-disposition"] ?? "";
      const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const regularMatch = disposition.match(/filename="?([^";]+)"?/i);
      const filename = encodedMatch ? decodeURIComponent(encodedMatch[1]) : regularMatch?.[1] ?? `enrolments.${format}`;

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
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Course Enrolments</h1>
          <p className="text-[13px] text-slate-500">Manage student course enrolments, transfers, and deferments</p>
        </div>
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
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">All Enrolments</h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading enrolments...</div>
        ) : enrolments.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No enrolments found for the current filters.</div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <Th>Student</Th>
                <Th>Admission #</Th>
                <Th>Course</Th>
                <Th>Curriculum</Th>
                <SortableTh sortKey="enrolment_date" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Enrolled</SortableTh>
                <SortableTh sortKey="status" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Status</SortableTh>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {enrolments.map((enrolment, index) => (
                <tr key={enrolment.id}>
                  <Td className="w-10 text-center text-slate-400">{(meta.current_page - 1) * meta.per_page + index + 1}</Td>
                  <Td>{enrolment.student_name}</Td>
                  <Td>{enrolment.admission_number}</Td>
                  <Td>{enrolment.course_name ?? "—"}</Td>
                  <Td>{enrolment.curriculum_name ?? "—"}</Td>
                  <Td>{enrolment.enrolment_date ?? "—"}</Td>
                  <Td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[enrolment.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {enrolment.status.charAt(0).toUpperCase() + enrolment.status.slice(1)}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openStatusModal(enrolment)} className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800">
                        <FileText className="h-3 w-3" />Update
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

      {/* Status Update Modal */}
      {selectedEnrolment ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="mb-1 text-[1.0625rem] font-semibold text-slate-900">Update Enrolment Status</h3>
            <p className="mb-5 text-[13px] text-slate-500">{selectedEnrolment.student_name} — {selectedEnrolment.course_name}</p>

            {modalErrors.root ? (
              <div className={`mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{modalErrors.root.message}</div>
            ) : null}

            <form onSubmit={handleSubmit(onSubmitStatus)} className="space-y-4">
              <div>
                <label htmlFor="modal-status" className="mb-1 block text-[13px] font-medium text-slate-600">Status</label>
                <select id="modal-status" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[14px] text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" {...register("status")}>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
                {modalErrors.status ? <p className="mt-1 text-sm text-red-600">{modalErrors.status.message}</p> : null}
              </div>

              {watchedStatus === "transferred" ? (
                <Controller
                  name="course_id"
                  control={control}
                  render={({ field }) => (
                    <LookupSelect
                      label="Transfer to Course"
                      value={field.value}
                      selectedOption={transferCourseOption}
                      onChange={(nextValue, option) => { field.onChange(nextValue); setTransferCourseOption(option); }}
                      fetchOptions={fetchCourseOptions}
                      placeholder="Search course"
                      emptyMessage="No courses found"
                      error={modalErrors.course_id?.message}
                    />
                  )}
                />
              ) : null}

              <div>
                <label htmlFor="modal-remarks" className="mb-1 block text-[13px] font-medium text-slate-600">Remarks</label>
                <textarea id="modal-remarks" className="h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" placeholder="Reason for status change..." {...register("remarks")} />
              </div>

              <div className="flex justify-end gap-3">
                <FormButton type="button" variant="secondary" onClick={closeStatusModal}>Cancel</FormButton>
                <FormButton type="submit" disabled={isUpdating}>{isUpdating ? "Updating..." : "Update Status"}</FormButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

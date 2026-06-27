import { useCallback, useEffect, useMemo, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useForm } from "react-hook-form";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
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

export function CourseEnrolmentsPage() {
  const api = useCourseEnrolmentsApi();
  const lookupApi = useLookupApi();

  const [enrolments, setEnrolments] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortDirection, setSortDirection] = useState("desc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Status update modal
  const [selectedEnrolment, setSelectedEnrolment] = useState(null);
  const [transferCourseOption, setTransferCourseOption] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);

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
        const response = await api.list({
          q: query,
          status: statusFilter,
          sort_by: sortBy,
          sort_direction: sortDirection,
          page,
          per_page: perPage,
        });

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

    return () => {
      isMounted = false;
    };
  }, [api, page, perPage, query, reloadKey, sortBy, sortDirection, statusFilter]);

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
    setStatusFilter("all");
    setSortBy("created_at");
    setSortDirection("desc");
    setPerPage(10);
    setPage(1);
  }

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

  async function fetchStudentOptions(query) {
    const response = await lookupApi.search("students", { query, limit: 5 });
    return response.data ?? [];
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Course Enrolments</h1>
          <p className="text-[13px] text-slate-500">Manage student course enrolments, transfers, and deferments</p>
        </div>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className="rounded-xl border border-slate-200/80 bg-white p-5"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_auto] xl:items-end">
          <div>
            <label className={`mb-2 block text-slate-600 ${labelClassName}`}>Search</label>
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className={inputClassName}
              placeholder="Search by student name, admission #, or course"
            />
          </div>
          <div>
            <label className={`mb-2 block text-slate-600 ${labelClassName}`}>Status</label>
            <select
              value={statusFilter}
              onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
              className={`${selectClassName} w-full`}
            >
              <option value="all">All Statuses</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
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
                <Th>Session</Th>
                <SortableTh sortKey="enrolment_date" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Enrolled</SortableTh>
                <SortableTh sortKey="status" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Status</SortableTh>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {enrolments.map((enrolment, index) => (
                <tr key={enrolment.id}>
                  <Td className="w-10 text-center text-slate-400">
                    {(meta.current_page - 1) * meta.per_page + index + 1}
                  </Td>
                  <Td>{enrolment.student_name}</Td>
                  <Td>{enrolment.admission_number}</Td>
                  <Td>{enrolment.course_name ?? "—"}</Td>
                  <Td>{enrolment.curriculum_name ?? "—"}</Td>
                  <Td>{enrolment.academic_session_name ?? "—"}</Td>
                  <Td>{enrolment.enrolment_date ?? "—"}</Td>
                  <Td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[enrolment.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {enrolment.status.charAt(0).toUpperCase() + enrolment.status.slice(1)}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openStatusModal(enrolment)}
                        className="inline-flex h-7 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-800"
                      >
                        <FileText className="h-3 w-3" />
                        Update
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
            <p className="mb-5 text-[13px] text-slate-500">
              {selectedEnrolment.student_name} — {selectedEnrolment.course_name}
            </p>

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
                      onChange={(nextValue, option) => {
                        field.onChange(nextValue);
                        setTransferCourseOption(option);
                      }}
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
                <textarea
                  id="modal-remarks"
                  className="h-24 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  placeholder="Reason for status change..."
                  {...register("remarks")}
                />
              </div>

              <div className="flex justify-end gap-3">
                <FormButton type="button" variant="secondary" onClick={closeStatusModal}>Cancel</FormButton>
                <FormButton type="submit" disabled={isUpdating}>
                  {isUpdating ? "Updating..." : "Update Status"}
                </FormButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}

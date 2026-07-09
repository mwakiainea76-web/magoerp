import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import * as yup from "yup";

import { bodyTextClassName, labelTextClassName, selectClassName, inputClassName, initialMeta, textAreaClassName, labelClassName } from "@/lib/styles";
import { Table, TableHeader, TableWrapper, Thead, Th, SortableTh, Tbody, Td, TableFooter } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { Modal, ModalBody, ModalFooter } from "@/components/Modal";
import { useCertificationAuthorityGradesApi } from "@/hooks/useCertificationAuthorityGradesApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const gradeSchema = yup.object({
  grade: yup
    .string()
    .required("Grade is required")
    .max(50, "Grade must be at most 50 characters"),
  grade_start: yup
    .number()
    .typeError("Start score is required")
    .required("Start score is required")
    .min(0, "Minimum score is 0")
    .max(100, "Maximum score is 100"),
  grade_end: yup
    .number()
    .typeError("End score is required")
    .required("End score is required")
    .min(0, "Minimum score is 0")
    .max(100, "Maximum score is 100")
    .test("gte", "End score must be greater than or equal to start score", function (value) {
      return value >= this.parent.grade_start;
    }),
  remark: yup.string().nullable().max(2000, "Remark must be at most 2000 characters"),
  is_active: yup.boolean().required(),
});

function normalizePayload(values) {
  return {
    grade: values.grade.trim(),
    grade_start: parseFloat(values.grade_start),
    grade_end: parseFloat(values.grade_end),
    remark: values.remark?.trim() || null,
    is_active: Boolean(values.is_active),
  };
}

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

function GradeRangeBar({ start, end }) {
  const left = start;
  const width = end - start;
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-2 flex-1 rounded-full bg-slate-100">
        <div
          className="absolute h-full rounded-full bg-emerald-500"
          style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }}
        />
      </div>
      <span className="whitespace-nowrap text-[12px] text-slate-500">
        {start}–{end}
      </span>
    </div>
  );
}

export function CertificationAuthorityGradesPage() {
  const [params] = useState(() => new URLSearchParams(window.location.search));
  const authorityId = params.get("authorityId") ?? "";
  const authorityName = params.get("authorityName") ?? "";
  const authorityCode = params.get("authorityCode") ?? "";

  const api = useCertificationAuthorityGradesApi(authorityId);

  const [grades, setGrades] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sortBy, setSortBy] = useState("grade_start");
  const [sortDirection, setSortDirection] = useState("asc");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadGrades() {
      setIsLoading(true);
      setError("");

      try {
        const response = await api.list({
          q: query,
          status,
          sort_by: sortBy,
          sort_direction: sortDirection,
          page,
          per_page: perPage,
        });

        if (isMounted) {
          setGrades(response.data ?? []);
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

    if (authorityId) {
      loadGrades();
    }

    return () => {
      isMounted = false;
    };
  }, [api, authorityId, page, perPage, query, reloadKey, sortBy, sortDirection, status]);

  async function handleDelete(grade) {
    const confirmed = window.confirm(`Delete grade "${grade.grade}"?`);
    if (!confirmed) return;

    setDeletingId(grade.id);
    setError("");

    try {
      await api.remove(grade.id);
      toast.success("Grade deleted successfully.");
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
    setSortBy("grade_start");
    setSortDirection("asc");
    setPerPage(10);
    setPage(1);
  }

  function handleSaved() {
    setReloadKey((current) => current + 1);
  }

  function openCreateModal() {
    setEditingId(null);
    setIsModalOpen(true);
  }

  function openEditModal(gradeId) {
    setEditingId(gradeId);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingId(null);
  }

  return (
    <>
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
              Grades — {authorityName || authorityCode || "..."}
            </h1>
            <p className="text-[13px] text-slate-500">
              Define grade ranges and labels for this certification authority
            </p>
          </div>

          <FormButton className="sm:px-5" onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            Add Grade
          </FormButton>
        </div>

        <form
          onSubmit={handleFilterSubmit}
          className="rounded-xl border border-slate-200/80 bg-white p-5"
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,0.6fr))_auto] xl:items-end">
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>
                Search
              </label>
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className={inputClassName}
                placeholder="Search by grade name or remark"
              />
            </div>
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>
                Status
              </label>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
                className={`${selectClassName} w-full`}
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
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
          <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>
            {error}
          </div>
        ) : null}

        <Table>
          <TableHeader>
            <h2 className="text-[1.0625rem] font-semibold text-slate-900">Grade Definitions</h2>
          </TableHeader>

          {!authorityId ? (
            <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No certification authority selected.</div>
          ) : isLoading ? (
            <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading grades...</div>
          ) : grades.length === 0 ? (
            <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No grades defined for this authority. Add one to get started.</div>
          ) : (
            <TableWrapper>
              <Thead>
                <tr>
                  <Th className="w-10 text-center">#</Th>
                  <SortableTh sortKey="grade" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Grade</SortableTh>
                  <SortableTh sortKey="grade_start" sortBy={sortBy} sortDirection={sortDirection} onSort={handleSort}>Score Range</SortableTh>
                  <Th>Remark</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {grades.map((grade, index) => (
                  <tr key={grade.id}>
                    <Td className="w-10 text-center text-slate-400">
                      {(meta.current_page - 1) * meta.per_page + index + 1}
                    </Td>
                    <Td className="font-medium text-slate-900">{grade.grade}</Td>
                    <Td>
                      <GradeRangeBar start={grade.grade_start} end={grade.grade_end} />
                    </Td>
                    <Td className="max-w-md text-slate-500">{grade.remark || "—"}</Td>
                    <Td><StatusBadge active={grade.is_active} /></Td>
                    <Td>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(grade.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(grade)}
                          disabled={deletingId === grade.id}
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

      <GradeModalForm
        open={isModalOpen}
        onClose={closeModal}
        gradeId={editingId}
        authorityId={authorityId}
        api={api}
        onSaved={handleSaved}
      />
    </>
  );
}

function GradeModalForm({ open, onClose, gradeId, authorityId, api, onSaved }) {
  const isEdit = Boolean(gradeId);
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const title = useMemo(
    () => (isEdit ? "Edit Grade" : "Add Grade"),
    [isEdit],
  );

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(gradeSchema),
    defaultValues: {
      grade: "",
      grade_start: "",
      grade_end: "",
      remark: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (!open) return;

    let isMounted = true;

    async function loadGrade() {
      setPageError("");

      if (!isEdit) {
        reset({
          grade: "",
          grade_start: "",
          grade_end: "",
          remark: "",
          is_active: true,
        });
        return;
      }

      setIsLoading(true);

      try {
        const response = await api.show(gradeId);

        if (!isMounted) return;

        const grade = response.data;
        reset({
          grade: grade.grade ?? "",
          grade_start: grade.grade_start ?? "",
          grade_end: grade.grade_end ?? "",
          remark: grade.remark ?? "",
          is_active: grade.is_active ?? true,
        });
      } catch (loadError) {
        if (isMounted) {
          setPageError(getApiErrorMessage(loadError, "Server error."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadGrade();

    return () => {
      isMounted = false;
    };
  }, [api, gradeId, isEdit, open, reset]);

  async function onSubmit(data) {
    setIsSaving(true);
    setPageError("");

    try {
      const payload = normalizePayload(data);
      const response = isEdit
        ? await api.update(gradeId, payload)
        : await api.create(payload);

      toast.success(isEdit ? "Grade updated successfully." : "Grade created successfully.");
      onSaved?.(response?.data ?? null);
    } catch (saveError) {
      const validationErrors = saveError?.response?.data?.errors;

      if (validationErrors) {
        Object.entries(validationErrors).forEach(([key, value]) => {
          setError(key, {
            message: value?.[0] ?? "Invalid value",
          });
        });
      } else {
        setPageError(getApiErrorMessage(saveError, "Server error."));
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={isSaving ? undefined : onClose}
      title={title}
      description="Set a grade label and its score range for this certification authority."
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalBody className="space-y-4">
          {pageError ? (
            <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>
              {pageError}
            </div>
          ) : null}

          {isLoading ? (
            <div className={`text-slate-500 ${bodyTextClassName}`}>Loading form...</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormInput
                id="grade"
                label="Grade"
                placeholder='e.g. "Mastery", "Credit", "A"'
                required
                error={errors.grade?.message}
                {...register("grade")}
              />

              <FormInput
                id="grade_start"
                label="Score Start"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="0"
                required
                error={errors.grade_start?.message}
                {...register("grade_start")}
              />

              <FormInput
                id="grade_end"
                label="Score End"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="100"
                required
                error={errors.grade_end?.message}
                {...register("grade_end")}
              />

              <div className="col-span-1 md:col-span-3">
                <label htmlFor="remark" className={labelClassName}>
                  Remark <span className="text-slate-400">(optional)</span>
                </label>
                <textarea
                  id="remark"
                  className={textAreaClassName}
                  placeholder='e.g. "Exceptional performance"'
                  {...register("remark")}
                />
                {errors.remark ? (
                  <p className={`mt-1 text-red-600 ${bodyTextClassName}`}>{errors.remark.message}</p>
                ) : null}
              </div>

              <label className="flex items-center gap-3 rounded-2xl px-1 py-2 text-slate-700 col-span-1 md:col-span-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600 focus:ring-emerald-500"
                  {...register("is_active")}
                />
                <span className={bodyTextClassName}>Grade is active and available for scoring.</span>
              </label>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <FormButton type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </FormButton>
          <FormButton type="submit" disabled={isSaving || isLoading}>
            {isSaving ? "Saving..." : isEdit ? "Update Grade" : "Create Grade"}
          </FormButton>
        </ModalFooter>
      </form>
    </Modal>
  );
}

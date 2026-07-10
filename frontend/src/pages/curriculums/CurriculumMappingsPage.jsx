import { useCallback, useEffect, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Link, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import * as yup from "yup";

import {
  Table,
  TableHeader,
  TableWrapper,
  Thead,
  Th,
  Tbody,
  Td,
  TableFooter,
} from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { FormInput } from "@/components/FormInput";
import { bodyTextClassName, labelTextClassName, selectClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useCourseCurriculaApi } from "@/hooks/useCourseCurriculaApi";
import { useCoursesApi } from "@/hooks/useCoursesApi";
import { useCurriculumsApi } from "@/hooks/useCurriculumsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const mappingSchema = yup.object({
  course_id: yup.string().required("Course is required"),
  curriculum_id: yup.string().required("Curriculum is required"),
});

export function CurriculumMappingsPage() {
  const api = useCourseCurriculaApi();
  const coursesApi = useCoursesApi();
  const curriculumsApi = useCurriculumsApi();

  const [mappings, setMappings] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [reloadKey, setReloadKey] = useState(0);

  const [showAddForm, setShowAddForm] = useState(false);
  const [courses, setCourses] = useState([]);
  const [curriculums, setCurriculums] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError: setFormError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(mappingSchema),
    defaultValues: { course_id: "", curriculum_id: "" },
  });

  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const res = await api.list({ q: query, page, per_page: perPage });
        if (mounted) {
          setMappings(res.data ?? []);
          setMeta(res.meta ?? initialMeta);
        }
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load mappings."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [api, page, perPage, query, reloadKey]);

  const loadFormData = useCallback(async () => {
    try {
      const [coursesRes, curriculumsRes] = await Promise.all([
        coursesApi.list({ per_page: 200 }),
        curriculumsApi.list({ per_page: 200 }),
      ]);
      setCourses(coursesRes.data ?? []);
      setCurriculums(curriculumsRes.data ?? []);
    } catch {
      // silent
    }
  }, [coursesApi, curriculumsApi]);

  async function handleAdd(data) {
    setIsSaving(true);
    try {
      const res = await api.create(data);
      toast.success(res.message ?? "Mapping created.");
      setShowAddForm(false);
      reset();
      setReloadKey((k) => k + 1);
    } catch (e) {
      const serverErrors = e?.response?.data?.errors;
      if (serverErrors) {
        Object.entries(serverErrors).forEach(([key, value]) => {
          setFormError(key, { message: value?.[0] ?? "Invalid value" });
        });
      } else {
        toast.error(getApiErrorMessage(e, "Failed to create mapping."));
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggle(mapping) {
    setTogglingId(mapping.id);
    try {
      const res = await api.update(mapping.id, { is_active: !mapping.is_active });
      toast.success(res.message ?? "Toggled.");
      setReloadKey((k) => k + 1);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to toggle."));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(mapping) {
    if (!window.confirm(`Remove ${mapping.curriculum_name} from ${mapping.course_name}?`)) return;
    setDeletingId(mapping.id);
    try {
      const res = await api.destroy(mapping.id);
      toast.success(res.message ?? "Removed.");
      setReloadKey((k) => k + 1);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to delete."));
    } finally {
      setDeletingId(null);
    }
  }

  function handleFilterSubmit(event) {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  }

  function handleResetFilters() {
    setSearchInput("");
    setQuery("");
    setPage(1);
    setPerPage(20);
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Curriculum Mappings</h1>
          <p className="text-[13px] text-slate-500">Manage curriculum assignments to courses</p>
        </div>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className="rounded-xl border border-slate-200/80 bg-white p-5"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_auto] xl:items-end">
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Search</label>
            <FormInput
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by course or curriculum name/code..."
            />
          </div>
          <div className="flex gap-3 xl:justify-end">
            <FormButton type="submit" className="w-full sm:w-auto">Apply</FormButton>
            <FormButton type="button" variant="secondary" className="w-full sm:w-auto" onClick={handleResetFilters}>Reset</FormButton>
            <FormButton type="button" onClick={() => { setShowAddForm(true); loadFormData(); }} className="w-full sm:w-auto">
              <Plus className="mr-1.5 h-4 w-4" /> Add Mapping
            </FormButton>
          </div>
        </div>
      </form>

      {showAddForm ? (
        <form onSubmit={handleSubmit(handleAdd)} className="rounded-xl border border-sky-100 bg-sky-50 p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-sky-900">New Mapping</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="course_id" className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Course</label>
              <select id="course_id" className={`${selectClassName} w-full`} {...register("course_id")}>
                <option value="">Select a course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
              {errors.course_id ? <p className="mt-1 text-sm text-red-600">{errors.course_id.message}</p> : null}
            </div>
            <div>
              <label htmlFor="curriculum_id" className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Curriculum</label>
              <select id="curriculum_id" className={`${selectClassName} w-full`} {...register("curriculum_id")}>
                <option value="">Select a curriculum...</option>
                {curriculums.map((cur) => (
                  <option key={cur.id} value={cur.id}>{cur.code} — {cur.name}</option>
                ))}
              </select>
              {errors.curriculum_id ? <p className="mt-1 text-sm text-red-600">{errors.curriculum_id.message}</p> : null}
            </div>
            <div className="flex items-end gap-2">
              <FormButton type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Create"}
              </FormButton>
              <FormButton type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
                Cancel
              </FormButton>
            </div>
          </div>
        </form>
      ) : null}

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      <Table>
        <TableHeader>
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">All Mappings</h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading mappings...</div>
        ) : mappings.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No mappings found.</div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <Th>Course</Th>
                <Th>Curriculum</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {mappings.map((mapping, index) => (
                <tr key={mapping.id}>
                  <Td className="w-10 text-center text-slate-400">
                    {(meta.current_page - 1) * meta.per_page + index + 1}
                  </Td>
                  <Td>
                    <div className="font-medium text-slate-900">{mapping.course_name}</div>
                    <div className="text-[12px] text-slate-500">{mapping.course_code}</div>
                  </Td>
                  <Td>
                    <div className="font-medium text-slate-900">{mapping.curriculum_name}</div>
                    <div className="text-[12px] text-slate-500">{mapping.curriculum_code}</div>
                  </Td>
                  <Td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      mapping.is_active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}>
                      {mapping.is_active ? "Active" : "Inactive"}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(mapping)}
                        disabled={togglingId === mapping.id}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          mapping.is_active
                            ? "border-amber-200 text-amber-500 hover:bg-amber-50"
                            : "border-emerald-200 text-emerald-500 hover:bg-emerald-50"
                        }`}
                        title={mapping.is_active ? "Deactivate" : "Activate"}
                      >
                        {mapping.is_active ? <ToggleLeft className="h-3.5 w-3.5" /> : <ToggleRight className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(mapping)}
                        disabled={deletingId === mapping.id}
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

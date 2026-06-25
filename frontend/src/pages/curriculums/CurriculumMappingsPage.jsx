import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

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
import { bodyTextClassName, labelTextClassName, selectClassName, inputClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useCourseCurriculaApi } from "@/hooks/useCourseCurriculaApi";
import { useCoursesApi } from "@/hooks/useCoursesApi";
import { useCurriculumsApi } from "@/hooks/useCurriculumsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

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
  const [newCourseId, setNewCourseId] = useState("");
  const [newCurriculumId, setNewCurriculumId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  async function handleAdd() {
    if (!newCourseId || !newCurriculumId) return;
    setIsSaving(true);
    try {
      const res = await api.create({ course_id: newCourseId, curriculum_id: newCurriculumId });
      toast.success(res.message ?? "Mapping created.");
      setShowAddForm(false);
      setNewCourseId("");
      setNewCurriculumId("");
      setReloadKey((k) => k + 1);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to create mapping."));
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
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={inputClassName}
              placeholder="Search by course or curriculum name/code..."
            />
          </div>
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Per Page</label>
            <select
              value={perPage}
              onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}
              className={`${selectClassName} w-full`}
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
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
        <div className="rounded-xl border border-sky-100 bg-sky-50 p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-sky-900">New Mapping</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Course</label>
              <select
                value={newCourseId}
                onChange={(e) => setNewCourseId(e.target.value)}
                className={`${selectClassName} w-full`}
              >
                <option value="">Select a course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Curriculum</label>
              <select
                value={newCurriculumId}
                onChange={(e) => setNewCurriculumId(e.target.value)}
                className={`${selectClassName} w-full`}
              >
                <option value="">Select a curriculum...</option>
                {curriculums.map((cur) => (
                  <option key={cur.id} value={cur.id}>{cur.code} — {cur.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <FormButton onClick={handleAdd} disabled={isSaving || !newCourseId || !newCurriculumId}>
                {isSaving ? "Saving..." : "Create"}
              </FormButton>
              <FormButton type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
                Cancel
              </FormButton>
            </div>
          </div>
        </div>
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
          <p className={`text-slate-500 ${bodyTextClassName}`}>
            {meta.total > 0
              ? `Showing ${meta.from} to ${meta.to} of ${meta.total} mappings`
              : "No results"}
          </p>
          <div className="flex items-center gap-3">
            <FormButton
              type="button"
              variant="secondary"
              className="h-9 w-auto px-4"
              disabled={meta.current_page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >Previous</FormButton>
            <span className={`text-slate-500 ${bodyTextClassName}`}>Page {meta.current_page} of {meta.last_page}</span>
            <FormButton
              type="button"
              variant="secondary"
              className="h-9 w-auto px-4"
              disabled={meta.current_page >= meta.last_page || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >Next</FormButton>
          </div>
        </TableFooter>
      </Table>
    </section>
  );
}

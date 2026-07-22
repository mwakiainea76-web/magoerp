import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";

import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { bodyTextClassName, labelClassName, selectClassName } from "@/lib/styles";
import { Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { useExamSeriesApi } from "@/hooks/useExamSeriesApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const seriesSchema = yup.object({
  academic_session_id: yup.string().required("Academic session is required"),
  name: yup.string().required("Name is required").max(100),
  is_active: yup.boolean(),
});

export function ExamSeriesPage() {
  const { seriesId } = useParams();
  const navigate = useNavigate();
  const api = useExamSeriesApi();
  const isEdit = Boolean(seriesId);
  const isForm = Boolean(seriesId) || window.location.pathname.endsWith("/create");

  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [seriesList, setSeriesList] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, per_page: 20, total: 0 });
  const [page, setPage] = useState(1);
  const [availableSessions, setAvailableSessions] = useState([]);

  const title = useMemo(() => (isEdit ? "Edit Exam Series" : "Add Exam Series"), [isEdit]);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(seriesSchema),
    defaultValues: {
      academic_session_id: "",
      name: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (isForm && !isEdit) {
      api.availableSessions()
        .then((res) => setAvailableSessions(res.data ?? []))
        .catch(() => {});
    }
  }, [isForm, isEdit, api]);

  useEffect(() => {
    if (!isForm) {
      let mounted = true;
      async function load() {
        setIsLoading(true);
        setPageError("");
        try {
          const res = await api.list({ page, per_page: meta.per_page });
          if (mounted) {
            setSeriesList(res.data ?? []);
            setMeta(res.meta ?? meta);
          }
        } catch (e) {
          if (mounted) setPageError(getApiErrorMessage(e, "Server error."));
        } finally {
          if (mounted) setIsLoading(false);
        }
      }
      load();
      return () => { mounted = false; };
    }
  }, [api, page, meta.per_page, reloadKey, isForm]);

  useEffect(() => {
    if (!isForm) return;
    let mounted = true;
    async function loadEdit() {
      if (!isEdit) { setIsLoading(false); return; }
      setIsLoading(true);
      setPageError("");
      try {
        const res = await api.show(seriesId);
        if (mounted) {
          const s = res.data;
          reset({
            academic_session_id: s.academic_session_id ?? "",
            name: s.name ?? "",
            is_active: s.is_active ?? true,
          });
        }
      } catch (e) {
        if (mounted) setPageError(getApiErrorMessage(e, "Server error."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    loadEdit();
    return () => { mounted = false; };
  }, [isForm, isEdit, seriesId, api, reset]);

  async function onSubmit(data) {
    setIsSaving(true);
    setPageError("");
    try {
      if (isEdit) {
        await api.update(seriesId, { name: data.name, is_active: data.is_active });
        toast.success("Exam series updated.");
        navigate("/admin/exam-series");
      } else {
        await api.create({ academic_session_id: data.academic_session_id, name: data.name });
        toast.success("Exam series created.");
        navigate("/admin/exam-series");
      }
    } catch (e) {
      const validationErrors = e?.response?.data?.errors;
      if (validationErrors) {
        Object.entries(validationErrors).forEach(([key, msgs]) => {
          setError(key, { message: msgs?.[0] ?? "Invalid" });
        });
      } else {
        setPageError(getApiErrorMessage(e, e?.response?.data?.message ?? "Server error."));
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(series) {
    if (!window.confirm(`Delete ${series.name}?`)) return;
    setDeletingId(series.id);
    setPageError("");
    try {
      await api.remove(series.id);
      toast.success("Exam series deleted.");
      setReloadKey((k) => k + 1);
    } catch (e) {
      setPageError(getApiErrorMessage(e, e?.response?.data?.message ?? "Server error."));
    } finally {
      setDeletingId(null);
    }
  }

  if (isForm) {
    return (
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">{title}</h1>
            <p className="text-[13px] text-slate-500">{isEdit ? "Edit the exam series name." : "Create an exam series for an academic session."}</p>
          </div>
          <Link to="/admin/exam-series" className="text-[14px] font-medium text-slate-500 hover:text-slate-900">
            &larr; Back to exam series
          </Link>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          {isLoading ? (
            <div className={`text-slate-500 ${bodyTextClassName}`}>Loading form...</div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
              {pageError ? (
                <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{pageError}</div>
              ) : null}

              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <div>
                  <label htmlFor="academic_session_id" className={labelClassName}>Academic Session <span className="text-red-400">*</span></label>
                  <select id="academic_session_id" className={`${selectClassName} w-full`} disabled={isEdit} {...register("academic_session_id")}>
                    <option value="">{isEdit ? "Assigned on creation" : "Select session"}</option>
                    {!isEdit && availableSessions.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {errors.academic_session_id && <p className="mt-1 text-[13px] text-red-600">{errors.academic_session_id.message}</p>}
                </div>

                <FormInput id="name" label="Series Name" placeholder="e.g. End of Year Exams 2025" required error={errors.name?.message} {...register("name")} />
              </div>

              <div className="flex items-center gap-2">
                <input id="is_active" type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" {...register("is_active")} />
                <label htmlFor="is_active" className="text-[14px] text-slate-700">Active</label>
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
                <Link to="/admin/exam-series">
                  <FormButton type="button" variant="secondary" className="w-full sm:w-auto sm:px-5">Cancel</FormButton>
                </Link>
                <FormButton type="submit" disabled={isSaving} className="sm:px-5">
                  {isSaving ? "Saving..." : isEdit ? "Update Series" : "Create Series"}
                </FormButton>
              </div>
            </form>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Exam Series</h1>
          <p className="text-[13px] text-slate-500">Exam series linked to academic sessions.</p>
        </div>
        <Link to="/admin/exam-series/create">
          <FormButton className="sm:px-5">
            <Plus className="mr-2 h-4 w-4" />
            Add Exam Series
          </FormButton>
        </Link>
      </div>

      {pageError ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{pageError}</div>
      ) : null}

      <Table>
        <TableHeader>
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">Exam Series Directory</h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading exam series...</div>
        ) : seriesList.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No exam series found.</div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <Th>Name</Th>
                <Th>Session</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </Thead>
            <Tbody>
              {seriesList.map((s, index) => (
                <tr key={s.id}>
                  <Td className="w-10 text-center text-slate-400">{(meta.current_page - 1) * meta.per_page + index + 1}</Td>
                  <Td className="font-medium text-slate-900">{s.name}</Td>
                  <Td>{s.academic_session?.name ?? "—"}</Td>
                  <Td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                      {s.is_active ? "Active" : "Inactive"}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-2">
                      <Link to={`/admin/exam-series/${s.id}/edit`} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700">
                        <Pencil className="h-3.5 w-3.5" />
                      </Link>
                      <button type="button" onClick={() => handleDelete(s)} disabled={deletingId === s.id} className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </TableWrapper>
        )}

        <PaginationFooter page={page} perPage={meta.per_page} total={meta.total} lastPage={meta.last_page} onPageChange={setPage} onPerPageChange={(pp) => setMeta((m) => ({ ...m, per_page: pp }))} />
      </Table>
    </section>
  );
}

export default ExamSeriesPage;

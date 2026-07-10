import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Plus, FileText, CheckCircle, Archive, Eye, Pencil, Search, RefreshCw } from "lucide-react";
import { FormInput } from "@/components/FormInput";
import { useFeeStructureApi } from "@/hooks/useFeeStructureApi";
import { useCourseCurriculaApi } from "@/hooks/useCourseCurriculaApi";
import { LookupSelect } from "@/components/LookupSelect";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function FeeStructureListPage() {
  const navigate = useNavigate();
  const api = useFeeStructureApi();
  const courseCurriculaApi = useCourseCurriculaApi();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [courseCurriculumId, setCourseCurriculumId] = useState("");
  const [selectedCourseCurriculum, setSelectedCourseCurriculum] = useState(null);
  const [error, setError] = useState("");

  const fetchData = useCallback(async (q = "", ccId = "") => {
    setLoading(true);
    setError("");
    try {
      const params = { q, per_page: 50 };
      if (ccId) params.course_curriculum_id = ccId;
      const res = await api.list(params);
      setData(res.data || []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load fee structures."));
    } finally {
      setLoading(false);
    }
  }, [api]);

  const fetchCourses = useCallback(async (query) => {
    const response = await courseCurriculaApi.search({ q: query });
    return (response?.data ?? []).map((item) => ({
      id: item.id,
      label: item.course_name,
      subtitle: item.authority_code && item.level ? `${item.authority_code} \u2022 ${item.level}` : "",
    }));
  }, [courseCurriculaApi]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  async function handlePublish(id) {
    try {
      await api.publish(id);
      fetchData(search, courseCurriculumId);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to publish."));
    }
  }

  async function handleArchive(id) {
    try {
      await api.archive(id);
      fetchData(search, courseCurriculumId);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to archive."));
    }
  }

  function handleCurriculumChange(id, option) {
    setCourseCurriculumId(id ?? "");
    setSelectedCourseCurriculum(option ?? null);
    fetchData(search, id ?? "");
  }

  function handleReset() {
    setSearch("");
    setCourseCurriculumId("");
    setSelectedCourseCurriculum(null);
    fetchData("", "");
  }

  function statusBadge(item) {
    if (item.is_issued) return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">Published</span>;
    if (item.is_active) return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">Draft</span>;
    return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">Archived</span>;
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">Fee Structures</h1>
          <p className="mt-1 text-[14px] text-slate-500">Manage fee templates, versions, and assignments.</p>
        </div>
        <button type="button" onClick={() => navigate("/admin/finance/fee-structures/create")}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus className="size-4" /> Create Fee Structure
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <FormInput type="text" value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchData(search, courseCurriculumId)}
            placeholder="Search by name or code..." />
        </div>
        <div className="min-w-[280px] flex-shrink-0">
          <LookupSelect
            value={courseCurriculumId}
            onChange={handleCurriculumChange}
            fetchOptions={fetchCourses}
            selectedOption={selectedCourseCurriculum}
            placeholder="Filter by course curriculum..."
          />
        </div>
        <button type="button" onClick={() => fetchData(search, courseCurriculumId)}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[13px] font-medium text-white hover:bg-emerald-700">
          <Search className="h-3.5 w-3.5" /> Search
        </button>
        <button type="button" onClick={handleReset}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-[13px] text-slate-600 hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 px-5 py-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <p className="mt-3 text-[14px] font-medium text-slate-500">No fee structures yet</p>
          <p className="text-[13px] text-slate-400">Create your first fee structure to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(item => (
            <div key={item.id} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-[15px] font-semibold text-slate-900">{item.name}</h3>
                  {statusBadge(item)}
                </div>
                <div className="mt-1.5 flex items-center gap-4 text-[12px] text-slate-500">
                  <span>Code: {item.code}</span>
                  <span>KES {Number(item.total_amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
                  <span>{item.items_count} item(s)</span>
                  <span>{item.assignments_count} assignment(s)</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => navigate(`/admin/finance/fee-structures/${item.id}`)}
                  className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600" title="View">
                  <Eye className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => navigate(`/admin/finance/fee-structures/${item.id}/edit`)}
                  className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600" title="Edit">
                  <Pencil className="h-4 w-4" />
                </button>
                {!item.is_issued && item.is_active && (
                  <button type="button" onClick={() => handlePublish(item.id)}
                    className="rounded-lg border border-emerald-300 p-2 text-emerald-600 hover:bg-emerald-50" title="Publish">
                    <CheckCircle className="h-4 w-4" />
                  </button>
                )}
                {item.is_active && (
                  <button type="button" onClick={() => handleArchive(item.id)}
                    className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-50" title="Archive">
                    <Archive className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
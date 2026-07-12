import { useEffect, useState } from "react";
import { Eye, Zap, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { SearchSelect } from "@/components/SearchSelect";
import { useCohortBillingApi } from "@/hooks/useCohortBillingApi";
import { authClient, getApiErrorMessage } from "@/lib/api/authClient";

const money = (value) =>
  `KES ${Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function CohortBillingPage() {
  const api = useCohortBillingApi();
  const [lookups, setLookups] = useState({ sessions: [], curricula: [] });
  const [form, setForm] = useState({
    academic_session_id: "",
    course_curriculum_id: "",
    year_level: "",
  });
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  // Load lookups on mount
  useEffect(() => {
    async function load() {
      try {
        const [sessionsRes, curriculaRes] = await Promise.all([
          authClient.get("/academic-sessions", { params: { per_page: 100 } }).then(r => r.data).catch(() => ({ data: [] })),
          authClient.get("/course-curricula", { params: { per_page: 200 } }).then(r => r.data).catch(() => ({ data: [] })),
        ]);
        setLookups({
          sessions: (sessionsRes.data || []).map(s => ({ id: s.id, label: s.name })),
          curricula: (curriculaRes.data || []).map(c => ({ id: c.id, label: `${c.course_name || c.course?.name || ''} - ${c.curriculum_name || c.curriculum?.name || ''}` })),
        });
      } catch { /* silent */ }
    }
    load();
  }, []);

  async function handlePreview() {
    if (!form.academic_session_id || !form.course_curriculum_id || !form.year_level) return;
    setLoading(true);
    setError("");
    setPreview(null);
    setResult(null);
    try {
      const res = await api.preview(form);
      setPreview(res.data);
    } catch (e) {
      setError(getApiErrorMessage(e, "Preview failed."));
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    setResult(null);
    try {
      const res = await api.generate(form);
      setResult(res.data);
    } catch (e) {
      setError(getApiErrorMessage(e, "Generation failed."));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">Cohort Billing</h1>
        <p className="mt-1 text-[14px] text-slate-500">Generate invoices for a group of students by programme and year level.</p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-[15px] font-semibold text-slate-900">Select Cohort</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">Academic Session</label>
            <SearchSelect placeholder="Select session" value={form.academic_session_id}
              options={lookups.sessions}
              onChange={v => setForm(p => ({ ...p, academic_session_id: v }))} />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">Programme</label>
            <SearchSelect placeholder="Select programme" value={form.course_curriculum_id}
              options={lookups.curricula}
              onChange={v => setForm(p => ({ ...p, course_curriculum_id: v }))} />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">Year Level</label>
            <select value={form.year_level} onChange={e => setForm(p => ({ ...p, year_level: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-[13px] outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500">
              <option value="">Select year</option>
              {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <button type="button" onClick={handlePreview} disabled={loading || !form.academic_session_id || !form.course_curriculum_id || !form.year_level}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            <Eye className="h-4 w-4" /> {loading ? "Previewing..." : "Preview"}
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

      {/* Preview Results */}
      {preview && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-emerald-500" />
            <h2 className="text-[15px] font-semibold text-slate-900">Preview</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4 text-center">
              <p className="text-[12px] font-medium text-slate-500">Students Found</p>
              <p className="mt-1 text-[22px] font-semibold text-slate-900">{preview.total_students}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-4 text-center">
              <p className="text-[12px] font-medium text-amber-600">Already Billed</p>
              <p className="mt-1 text-[22px] font-semibold text-amber-700">{preview.already_billed}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-4 text-center">
              <p className="text-[12px] font-medium text-red-600">Missing Fee Structure</p>
              <p className="mt-1 text-[22px] font-semibold text-red-700">{preview.missing_fee_structure}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4 text-center">
              <p className="text-[12px] font-medium text-emerald-600">Will Generate</p>
              <p className="mt-1 text-[22px] font-semibold text-emerald-700">{preview.will_generate}</p>
            </div>
          </div>
          <div className="mt-4 rounded-xl bg-emerald-50 p-4">
            <p className="text-[13px] font-medium text-emerald-700">
              Total Amount: {money(preview.total_amount)}
            </p>
            {preview.fee_structure_name && (
              <p className="text-[12px] text-emerald-600">Fee Structure: {preview.fee_structure_name}</p>
            )}
          </div>
          {!preview.has_fee_structure && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              <AlertCircle className="h-4 w-4" /> No published fee structure found for this programme and year level.
            </div>
          )}
          {preview.will_generate > 0 && (
            <div className="mt-4">
              <button type="button" onClick={handleGenerate} disabled={generating}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                <Zap className="h-4 w-4" /> {generating ? "Generating..." : `Generate ${preview.will_generate} Invoice(s)`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Generation Result */}
      {result && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            <h2 className="text-[15px] font-semibold text-slate-900">Generation Result</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span className="text-[13px] font-medium text-emerald-700">{result.generated} generated</span>
            </div>
            {result.failed > 0 && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3">
                <XCircle className="h-4 w-4 text-red-600" />
                <span className="text-[13px] font-medium text-red-700">{result.failed} failed</span>
              </div>
            )}
          </div>
          {result.errors?.length > 0 && (
            <div className="mt-3 space-y-1">
              {result.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-[12px] text-red-600">
                  <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" />
                  <span>{err.student}: {err.error}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

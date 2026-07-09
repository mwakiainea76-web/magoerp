import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { useFeeStructureApi } from "@/hooks/useFeeStructureApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const money = (value) =>
  `KES ${Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function FeeStructureDetailPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const api = useFeeStructureApi();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!templateId) return;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await api.show(templateId);
        setData(res.data);
      } catch (e) {
        setError(getApiErrorMessage(e, "Failed to load fee structure."));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [templateId, api]);

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center text-red-600">{error}</div>
      </section>
    );
  }

  if (!data) return null;

  const statusBadge = data.is_issued
    ? <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">Published</span>
    : data.is_active
      ? <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-700">Draft</span>
      : <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">Archived</span>;

  const totalAmount = data.items?.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0) || 0;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate("/admin/finance/fee-structures")}
            className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">{data.name}</h1>
              {statusBadge}
            </div>
            <p className="mt-0.5 text-[13px] text-slate-500">Code: {data.code}</p>
          </div>
        </div>
        <button type="button" onClick={() => navigate(`/admin/finance/fee-structures/${templateId}/edit`)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[13px] font-medium text-white hover:bg-emerald-700">
          <Pencil className="h-3.5 w-3.5" /> Edit
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-slate-500">Description</h3>
          <p className="text-[13px] text-slate-700">{data.description || "No description provided."}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-slate-500">Total Amount</h3>
          <p className="text-[18px] font-semibold text-emerald-700">{money(totalAmount)}</p>
          <p className="text-[12px] text-slate-400">{data.items?.length || 0} item(s)</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-slate-500">Assignment</h3>
        {data.assignment ? (
          <div className="mt-2 grid gap-3 md:grid-cols-4">
            <div>
              <p className="text-[11px] font-medium text-slate-400">Scope</p>
              <p className="text-[13px] font-medium text-slate-900">
                {data.assignment.course_curriculum_id ? "Course" : data.assignment.department_id ? "Department" : "All Courses"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Target</p>
              <p className="text-[13px] font-medium text-slate-900">
                {data.assignment.course_name || data.assignment.curriculum_name || "All"}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Year Level</p>
              <p className="text-[13px] font-medium text-slate-900">
                {data.assignment.year_level === 0 || !data.assignment.year_level ? "All Years" : `Year ${data.assignment.year_level}`}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-400">Issue</p>
              <p className="text-[13px] font-medium text-slate-900">
                {data.assignment.issuance_type === "per_session" ? "Once per Session" : "Every Session"}
              </p>
            </div>
            {data.assignment.child_assignments?.length > 0 && (
              <div className="md:col-span-4">
                <p className="text-[11px] font-medium text-slate-400 mb-1">Session Breakdown</p>
                <div className="space-y-1">
                  {data.assignment.child_assignments.map((c, i) => (
                    <div key={i} className="flex justify-between text-[13px]">
                      <span className="text-slate-600">{c.session_name || `Session ${c.session_number}`}</span>
                      <span className="font-medium text-slate-900">{money(c.split_amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 text-[13px] text-slate-500">No assignment configured.</p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-[15px] font-semibold text-slate-900">Fee Items</h3>
        </div>
        {!data.items || data.items.length === 0 ? (
          <div className="px-5 py-8 text-center text-[13px] text-slate-500">No items.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.items.map((item, i) => (
              <div key={item.id || i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-[13px] font-medium text-slate-900">{item.name}</p>
                  {item.description && <p className="text-[12px] text-slate-400">{item.description}</p>}
                </div>
                <p className="text-[13px] font-semibold text-slate-900">{money(item.amount)}</p>
              </div>
            ))}
            <div className="flex items-center justify-between bg-slate-50 px-5 py-3 font-semibold">
              <p className="text-[13px] text-slate-700">Total</p>
              <p className="text-[13px] text-emerald-700">{money(totalAmount)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-[12px] text-slate-400">
        <FileText className="h-3.5 w-3.5" />
        <span>Created: {data.created_at ? new Date(data.created_at).toLocaleDateString() : "—"}</span>
        <span className="text-slate-200">|</span>
        <span>Updated: {data.updated_at ? new Date(data.updated_at).toLocaleDateString() : "—"}</span>
      </div>
    </section>
  );
}

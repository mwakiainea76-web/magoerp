import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { SearchSelect } from "@/components/SearchSelect";
import { useFeeStructureApi } from "@/hooks/useFeeStructureApi";

export function CourseFeeAssignmentPage() {
  const navigate = useNavigate();
  const feeStructureApi = useFeeStructureApi();

  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    feeStructureApi.list({ per_page: 100 })
      .then((res) => setAll(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [feeStructureApi]);

  const [selectedId, setSelectedId] = useState("");

  const visible = useMemo(() => {
    if (!selectedId) return all.slice(0, 5);
    return all.filter((s) => s.id === selectedId);
  }, [all, selectedId]);

  const options = useMemo(
    () => all.map((s) => ({
      id: s.id,
      label: `${s.code} — ${s.name} (KES ${Number(s.total_amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })})`,
    })),
    [all],
  );

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">Course Fee Assignment</h1>
        <p className="mt-1 text-[14px] text-slate-500">Search and select a fee structure to configure its assignment.</p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Filter by Fee Structure</label>
        <SearchSelect
          placeholder="Search by code or name..."
          options={options}
          value={selectedId}
          onChange={(id) => setSelectedId(id || "")}
        />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-2 p-5">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : visible.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-[14px] text-slate-500">No fee structures found.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visible.map((structure) => (
              <div key={structure.id}
                className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-slate-900">{structure.name}</p>
                  <p className="mt-0.5 text-[12px] text-slate-500">
                    {structure.code} &middot; KES {Number(structure.total_amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    &middot; {structure.items_count} item{structure.items_count !== 1 ? "s" : ""}
                  </p>
                </div>
                <button type="button" onClick={() => navigate(`/admin/finance/course-fee/${structure.id}/assign`)}
                  className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-medium text-emerald-700 hover:bg-emerald-100">
                  Assign <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default CourseFeeAssignmentPage;

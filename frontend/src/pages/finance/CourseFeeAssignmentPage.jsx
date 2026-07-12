import { useCallback, useEffect, useState } from "react";
import { Search, RefreshCw, FileText, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { FormInput } from "@/components/FormInput";
import { useFeeStructureApi } from "@/hooks/useFeeStructureApi";

export function CourseFeeAssignmentPage() {
  const navigate = useNavigate();
  const feeStructureApi = useFeeStructureApi();

  const [structures, setStructures] = useState([]);
  const [loadingStructures, setLoadingStructures] = useState(true);
  const [search, setSearch] = useState("");

  const loadStructures = useCallback(
    async (q = "") => {
      setLoadingStructures(true);
      try {
        const res = await feeStructureApi.list({ q, per_page: 50 });
        setStructures(res.data || []);
      } catch {
        // silent
      } finally {
        setLoadingStructures(false);
      }
    },
    [feeStructureApi],
  );

  useEffect(() => { loadStructures(); }, [loadStructures]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">Course Fee Assignment</h1>
        <p className="mt-1 text-[14px] text-slate-500">Select a fee structure to configure its assignment.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <FormInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadStructures(search.trim())}
            placeholder="Search fee structures by name or code..."
          />
        </div>
        <button type="button" onClick={() => loadStructures(search.trim())}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[13px] font-medium text-white hover:bg-emerald-700">
          <Search className="h-3.5 w-3.5" /> Search
        </button>
        <button type="button" onClick={() => { setSearch(""); loadStructures(""); }}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-[13px] text-slate-600 hover:bg-slate-50">
          <RefreshCw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {loadingStructures ? (
          <div className="space-y-2 p-5">
            {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />)}
          </div>
        ) : structures.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-[14px] text-slate-500">
              {search ? "No fee structures match your search." : "No fee structures available."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {structures.map((structure) => (
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

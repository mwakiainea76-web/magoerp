import { useEffect, useState } from "react";

import { bodyTextClassName } from "@/lib/styles";
import { Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td } from "@/components/DataTable";
import { useMarksApi } from "@/hooks/useMarksApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function MyResultsPage() {
  const marksApi = useMarksApi();

  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const res = await marksApi.myResults();
        if (mounted) setResults(res.data ?? []);
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load results."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (isLoading) {
    return (
      <section className="space-y-5">
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">My Results</h1>
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-slate-500 ${bodyTextClassName}`}>
          Loading results...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-5">
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">My Results</h1>
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">My Results</h1>
        <p className="text-[13px] text-slate-500">Your published assessment marks</p>
      </div>

      {results.length === 0 ? (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
          No results published yet. Check back later.
        </div>
      ) : (
        results.map((unitResult) => (
          <div key={unitResult.unit.id} className="rounded-xl border border-slate-200/80 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-slate-900">
                {unitResult.unit.code} — {unitResult.unit.name}
              </h2>
              <p className="text-[12px] text-slate-500">
                Total: {unitResult.total_marks} | Average: {unitResult.average}
              </p>
            </div>

            {unitResult.assessments.map((assessment) => (
              <div key={assessment.type} className="border-b border-slate-50 px-5 py-3 last:border-0">
                <h3 className="mb-2 text-[13px] font-medium text-slate-700">{assessment.type}</h3>
                <div className="flex flex-wrap gap-2">
                  {assessment.marks.map((mark) => (
                    <span
                      key={mark.number}
                      className="inline-flex items-center rounded-lg bg-slate-50 px-3 py-1.5 text-[13px]"
                    >
                      <span className="text-slate-500">#</span>{mark.number}
                      <span className="mx-1.5 text-slate-300">—</span>
                      <span className="font-semibold text-slate-800">{mark.marks}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </section>
  );
}

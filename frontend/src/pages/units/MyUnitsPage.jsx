import { useEffect, useState } from "react";

import { bodyTextClassName } from "@/lib/styles";
import { useUnitsApi } from "@/hooks/useUnitsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function MyUnitsPage() {
  const unitsApi = useUnitsApi();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const res = await unitsApi.myUnits();
        if (mounted) setData(res.data ?? null);
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load units."));
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
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">My Units</h1>
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
          Loading units...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-5">
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">My Units</h1>
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      </section>
    );
  }

  if (!data || !data.years || data.years.length === 0) {
    return (
      <section className="space-y-5">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">My Units</h1>
          <p className="text-[13px] text-slate-500">No units found for your current course.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
          {data.course_initials ?? data.course_name}
        </h1>
        <p className="text-[13px] text-slate-500">{data.course_name} &mdash; {data.course_code}</p>
      </div>

      {data.years.map((year) => (
        <div key={year.year_of_study} className="rounded-xl border border-slate-200/80 bg-white">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="text-[15px] font-semibold text-slate-900">Year {year.year_of_study}</h2>
          </div>

          {year.sessions.map((session) => (
            <div key={session.session}>
              {session.modules.map((mod) => (
                <div key={mod.module} className={mod.module !== session.modules[0]?.module || session.session !== year.sessions[0]?.session ? "border-t border-slate-100" : ""}>
                  <div className="px-5 py-3 text-[13px] font-medium text-slate-500">
                    Session {session.session} &mdash; Module {mod.module}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[13px]">
                      <thead>
                        <tr className="border-y border-slate-100 bg-slate-50/50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <th className="px-5 py-2.5 w-16">#</th>
                          <th className="px-5 py-2.5">Unit Code</th>
                          <th className="px-5 py-2.5">Unit Name</th>
                          <th className="px-5 py-2.5 w-28">Credit Factor</th>
                          <th className="px-5 py-2.5 w-24">Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mod.units.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                              No units in this module.
                            </td>
                          </tr>
                        ) : (
                          mod.units.map((unit, index) => (
                            <tr key={unit.id} className="border-b border-slate-50 last:border-b-0">
                              <td className="px-5 py-2.5 text-slate-400">{index + 1}</td>
                              <td className="px-5 py-2.5 font-medium text-slate-700">{unit.code}</td>
                              <td className="px-5 py-2.5 text-slate-800">{unit.name}</td>
                              <td className="px-5 py-2.5 text-slate-600">{unit.credit_factor ?? "—"}</td>
                              <td className="px-5 py-2.5 text-slate-600">{unit.taught_hours ?? "—"}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

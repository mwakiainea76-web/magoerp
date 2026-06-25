import { useEffect, useState } from "react";

import { bodyTextClassName } from "@/lib/styles";
import { useTimetableApi } from "@/hooks/useTimetableApi";
import { getApiErrorMessage } from "@/lib/api/authClient";
import { TimetableGrid } from "@/pages/timetables/TimetableViewPage";

export function MyTimetablePage() {
  const timetableApi = useTimetableApi();

  const [grid, setGrid] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const res = await timetableApi.myTimetable();
        if (mounted) setGrid(res.data?.grid ?? {});
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load timetable."));
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
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">My Timetable</h1>
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
          Loading timetable...
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-5">
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">My Timetable</h1>
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">My Timetable</h1>
        <p className="text-[13px] text-slate-500">Your weekly class schedule</p>
      </div>
      <TimetableGrid grid={grid} />
    </section>
  );
}

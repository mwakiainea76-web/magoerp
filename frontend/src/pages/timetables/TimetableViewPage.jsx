import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";

import { bodyTextClassName } from "@/lib/styles";
import { LookupSelect } from "@/components/LookupSelect";
import { useTimetableApi } from "@/hooks/useTimetableApi";
import { useCourseCurriculaApi } from "@/hooks/useCourseCurriculaApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function TimetableGrid({ grid, onDelete }) {
  return (
    <div className="grid grid-cols-7 gap-3">
      {DAYS.map((day) => (
        <div key={day} className="rounded-xl border border-slate-200/80 bg-white">
          <div className="border-b border-slate-100 px-3 py-2 text-center">
            <h3 className="text-[13px] font-semibold text-slate-700">{day.slice(0, 3)}</h3>
          </div>
          <div className="space-y-2 p-3">
            {(grid?.[day] ?? []).length === 0 ? (
              <p className="py-4 text-center text-[12px] text-slate-400">—</p>
            ) : (
              (grid[day] ?? []).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-lg bg-emerald-50 px-2.5 py-2 text-[12px] leading-tight"
                >
                  <div className="font-semibold text-emerald-800">{entry.unit_code}</div>
                  <div className="text-emerald-600">{entry.start_time}–{entry.end_time}</div>
                  <div className="text-emerald-500">{entry.trainer_name ?? "—"}</div>
                  <div className="text-emerald-400">{entry.room_code ?? entry.room_name}</div>
                  {onDelete ? (
                    <button
                      type="button"
                      onClick={() => onDelete(entry.id)}
                      className="mt-1 inline-flex items-center gap-1 text-[11px] text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function TimetableViewPage() {
  const timetableApi = useTimetableApi();
  const courseCurriculaApi = useCourseCurriculaApi();

  const [courseCurriculumId, setCourseCurriculumId] = useState("");
  const [selectedCourseCurriculum, setSelectedCourseCurriculum] = useState(null);
  const [grid, setGrid] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchCurricula = useCallback(async (query) => {
    const res = await courseCurriculaApi.list({ q: query, per_page: 200 });
    return (res.data ?? []).map((cc) => ({
      id: cc.id,
      label: `${cc.course_code} — ${cc.curriculum_name}`,
    }));
  }, []);

  async function loadGrid() {
    if (!courseCurriculumId) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await timetableApi.weekGrid({ course_curriculum_id: courseCurriculumId });
      setGrid(res.data?.grid ?? {});
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load timetable."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadGrid(); }, [courseCurriculumId]);

  function handleCourseCurriculumChange(id, option) {
    setCourseCurriculumId(id ?? "");
    setSelectedCourseCurriculum(option);
  }

  async function handleDelete(id) {
    if (!window.confirm("Remove this timetable entry?")) return;
    try {
      await timetableApi.destroy(id);
      toast.success("Entry removed.");
      await loadGrid();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to remove."));
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Timetables</h1>
          <p className="text-[13px] text-slate-500">Weekly academic timetable grid</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <LookupSelect
            label="Course Curriculum"
            value={courseCurriculumId}
            onChange={handleCourseCurriculumChange}
            fetchOptions={fetchCurricula}
            selectedOption={selectedCourseCurriculum}
            placeholder="Search course curriculum"
          />
        </div>
      </div>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      {isLoading ? (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
          Loading timetable...
        </div>
      ) : courseCurriculumId ? (
        <TimetableGrid grid={grid} onDelete={handleDelete} />
      ) : (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
          Select a course curriculum to view the timetable.
        </div>
      )}
    </section>
  );
}

export { TimetableGrid };

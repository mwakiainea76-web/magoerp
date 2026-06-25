import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Clock, MapPin, Pencil, Trash2, User } from "lucide-react";

import { bodyTextClassName } from "@/lib/styles";
import { LookupSelect } from "@/components/LookupSelect";
import { useTimetableApi } from "@/hooks/useTimetableApi";
import { useCourseCurriculaApi } from "@/hooks/useCourseCurriculaApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function TimetableGrid({ grid, onDelete }) {
  const navigate = useNavigate();

  const timeSlots = useMemo(() => {
    const times = new Set();
    Object.values(grid).forEach((entries) => {
      entries.forEach((e) => times.add(e.start_time));
    });
    return [...times].sort();
  }, [grid]);

  const entriesByDayTime = useMemo(() => {
    const map = {};
    DAYS.forEach((day) => {
      map[day] = {};
      (grid[day] ?? []).forEach((e) => {
        if (!map[day][e.start_time]) map[day][e.start_time] = [];
        map[day][e.start_time].push(e);
      });
    });
    return map;
  }, [grid]);

  if (timeSlots.length === 0) {
    return (
      <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
        No timetable entries found.
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-xl border border-slate-200/80 bg-white">
      <table className="w-full min-w-[700px] table-fixed border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-[120px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-[13px] font-semibold text-slate-600">
              Day
            </th>
            {timeSlots.map((time) => (
              <th
                key={time}
                className="border-b border-slate-200 bg-slate-50 px-2 py-3 text-center text-[13px] font-semibold text-slate-600"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {time}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day, di) => (
            <tr key={day}>
              <td className="sticky left-0 z-10 border-b border-slate-100 bg-white px-4 py-3 text-[13px] font-medium text-slate-700">
                {day}
              </td>
              {timeSlots.map((time) => {
                const entries = entriesByDayTime[day][time] ?? [];
                return (
                  <td
                    key={`${day}-${time}`}
                    className={`border-b border-slate-100 px-1.5 py-1.5 align-top ${entries.length === 0 ? "bg-slate-50/50" : ""}`}
                  >
                    {entries.length === 0 ? (
                      <div className="h-full min-h-[52px]" />
                    ) : (
                      <div className="space-y-1.5">
                        {entries.map((entry) => (
                          <div
                            key={entry.id}
                            className="group relative rounded-lg border-l-[3px] border-emerald-500 bg-emerald-50/70 px-2.5 pb-2 pt-2.5 text-[11px] leading-snug transition hover:bg-emerald-50"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="truncate font-semibold text-emerald-800">
                                {entry.unit_code}
                              </span>
                              {onDelete ? (
                                <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/timetables/${entry.id}/edit`)}
                                    className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                                    title="Edit"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDelete(entry.id)}
                                    className="rounded p-0.5 text-red-400 hover:bg-red-100 hover:text-red-600"
                                    title="Remove"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : null}
                            </div>
                            <div className="mt-1 space-y-0.5 text-slate-500">
                              {entry.trainer_name ? (
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 shrink-0" />
                                  <span className="truncate">{entry.trainer_name}</span>
                                </div>
                              ) : null}
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3 shrink-0" />
                                <span className="truncate">{entry.room_code ?? entry.room_name ?? "—"}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TimetableViewPage() {
  const timetableApi = useTimetableApi();
  const courseCurriculaApi = useCourseCurriculaApi();

  const [courseCurriculumId, setCourseCurriculumId] = useState("");
  const [selectedCourseCurriculum, setSelectedCourseCurriculum] = useState(null);
  const [moduleFilter, setModuleFilter] = useState(0);
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
      const params = { course_curriculum_id: courseCurriculumId };
      if (moduleFilter) params.module = moduleFilter;
      const res = await timetableApi.weekGrid(params);
      setGrid(res.data?.grid ?? {});
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load timetable."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadGrid(); }, [courseCurriculumId, moduleFilter]);

  function handleCourseCurriculumChange(id, option) {
    setCourseCurriculumId(id ?? "");
    setSelectedCourseCurriculum(option);
    setModuleFilter(0);
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
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-600">Module</label>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(Number(e.target.value))}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition"
            >
              <option value={0}>All</option>
              <option value={1}>Module 1</option>
              <option value={2}>Module 2</option>
              <option value={3}>Module 3</option>
            </select>
          </div>
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

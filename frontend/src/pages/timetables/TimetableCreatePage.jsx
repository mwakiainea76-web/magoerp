import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { bodyTextClassName, inputClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { LookupSelect } from "@/components/LookupSelect";
import { useTimetableApi } from "@/hooks/useTimetableApi";
import { useCourseCurriculaApi } from "@/hooks/useCourseCurriculaApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const DAYS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

function joinLabel(parts) {
  return parts.filter(Boolean).join(" - ");
}

function formatClock(value, fallback) {
  return value ? String(value).slice(0, 5) : fallback;
}

export function TimetableCreatePage() {
  const { timetableId } = useParams();
  const isEdit = Boolean(timetableId);
  const navigate = useNavigate();
  const timetableApi = useTimetableApi();
  const courseCurriculaApi = useCourseCurriculaApi();
  const initialLoadDone = useRef(false);

  const [courseCurriculumId, setCourseCurriculumId] = useState("");
  const [selectedCourseCurriculum, setSelectedCourseCurriculum] = useState(null);
  const [unitId, setUnitId] = useState("");
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [moduleFilter, setModuleFilter] = useState(0);
  const [trainerId, setTrainerId] = useState("");
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchCurricula = useCallback(async (query) => {
    const res = await courseCurriculaApi.list({ q: query, per_page: 200 });
    return (res.data ?? []).map((cc) => ({
      id: cc.id,
      label: [cc.course_code, cc.course_name, cc.curriculum_code, cc.curriculum_name]
        .filter(Boolean)
        .join(" - "),
    }));
  }, [courseCurriculaApi]);

  const fetchUnits = useCallback(async (query) => {
    if (!courseCurriculumId) return [];
    const params = { course_curriculum_id: courseCurriculumId, q: query };
    if (moduleFilter) params.module = moduleFilter;
    const res = await timetableApi.availableUnits(params);
    return (res.data ?? []).map((u) => ({
      id: u.id,
      label: [u.code, u.name].filter(Boolean).join(" - "),
    }));
  }, [courseCurriculumId, moduleFilter, timetableApi]);

  const fetchTrainers = useCallback(async (query) => {
    const res = await timetableApi.staffList();
    const items = res.data ?? [];
    if (!query) return items.map((s) => ({ id: s.id, label: `${s.name} (${s.employee_number})` }));
    return items
      .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
      .map((s) => ({ id: s.id, label: `${s.name} (${s.employee_number})` }));
  }, [timetableApi]);

  const fetchRooms = useCallback(async (query) => {
    const res = await timetableApi.lectureRooms();
    const items = res.data ?? [];
    if (!query) return items.map((r) => ({ id: r.id, label: `${r.name} (${r.code})${r.capacity ? ` - ${r.capacity} seats` : ""}` }));
    return items
      .filter((r) => r.name.toLowerCase().includes(query.toLowerCase()) || r.code.toLowerCase().includes(query.toLowerCase()))
      .map((r) => ({ id: r.id, label: `${r.name} (${r.code})${r.capacity ? ` - ${r.capacity} seats` : ""}` }));
  }, [timetableApi]);

  useEffect(() => {
    if (!isEdit || initialLoadDone.current) return;
    let mounted = true;
    async function load() {
      try {
        const res = await timetableApi.show(timetableId);
        if (!mounted) return;
        const d = res.data;
        const courseCurriculumLabel = d.course_curriculum_label
          || joinLabel([d.course_code || d.course_initials, d.course_name, d.curriculum_code, d.curriculum_name]);
        const unitLabel = joinLabel([d.unit_code, d.unit_name]);
        const trainerLabel = d.trainer_name
          ? `${d.trainer_name}${d.trainer_employee_number ? ` (${d.trainer_employee_number})` : ""}`
          : "";
        const roomLabel = d.room_name
          ? `${d.room_name}${d.room_code ? ` (${d.room_code})` : ""}`
          : "";

        setCourseCurriculumId(d.course_curriculum_id ?? "");
        setSelectedCourseCurriculum(d.course_curriculum_id ? { id: d.course_curriculum_id, label: courseCurriculumLabel } : null);
        setUnitId(d.unit_id ?? "");
        setSelectedUnit(d.unit_id ? { id: d.unit_id, label: unitLabel } : null);
        setTrainerId(d.trainer_staff_id ?? "");
        setSelectedTrainer(d.trainer_staff_id ? { id: d.trainer_staff_id, label: trainerLabel } : null);
        setRoomId(d.lecture_room_id ?? "");
        setSelectedRoom(d.lecture_room_id ? { id: d.lecture_room_id, label: roomLabel } : null);
        setDayOfWeek(d.day_of_week ?? 0);
        setStartTime(formatClock(d.start_time, "08:00"));
        setEndTime(formatClock(d.end_time, "10:00"));
        initialLoadDone.current = true;
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load timetable entry."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [isEdit, timetableId, timetableApi]);

  function handleCourseCurriculumChange(id, option) {
    setCourseCurriculumId(id ?? "");
    setSelectedCourseCurriculum(option);
    setUnitId("");
    setSelectedUnit(null);
    setModuleFilter(0);
  }

  function handleUnitChange(id, option) {
    setUnitId(id ?? "");
    setSelectedUnit(option);
  }

  function handleTrainerChange(id, option) {
    setTrainerId(id ?? "");
    setSelectedTrainer(option);
  }

  function handleRoomChange(id, option) {
    setRoomId(id ?? "");
    setSelectedRoom(option);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!courseCurriculumId || !unitId || !roomId) {
      setError("Course curriculum, unit, and lecture room are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        unit_id: unitId,
        trainer_staff_id: trainerId || null,
        lecture_room_id: roomId,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
      };

      if (isEdit) {
        await timetableApi.update(timetableId, payload);
        toast.success("Timetable entry updated.");
      } else {
        await timetableApi.create(payload);
        toast.success("Timetable entry created.");
      }
      navigate("/timetables");
    } catch (e) {
      setError(getApiErrorMessage(e, `Failed to ${isEdit ? "update" : "create"} timetable entry.`));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <section className="space-y-5">
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
          Loading timetable entry...
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">{isEdit ? "Edit Timetable Entry" : "Add Timetable Entry"}</h1>
        <p className="text-[13px] text-slate-500">{isEdit ? "Update the scheduled session" : "Schedule a lecture, practical, or tutorial session"}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <LookupSelect
              label="Course Curriculum"
              value={courseCurriculumId}
              onChange={handleCourseCurriculumChange}
              fetchOptions={fetchCurricula}
              selectedOption={selectedCourseCurriculum}
              required
              placeholder="Search course curriculum"
            />

            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">Module</label>
              <select
                value={moduleFilter}
                onChange={(e) => { setModuleFilter(Number(e.target.value)); setUnitId(""); setSelectedUnit(null); }}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition"
                disabled={!courseCurriculumId}
              >
                <option value={0}>All</option>
                <option value={1}>Module 1</option>
                <option value={2}>Module 2</option>
                <option value={3}>Module 3</option>
              </select>
            </div>

            <LookupSelect
              label="Unit"
              value={unitId}
              onChange={handleUnitChange}
              fetchOptions={fetchUnits}
              selectedOption={selectedUnit}
              required
              disabled={!courseCurriculumId}
              placeholder={courseCurriculumId ? "Search unit" : "Select a curriculum first"}
            />

            <LookupSelect
              label="Trainer"
              value={trainerId}
              onChange={handleTrainerChange}
              fetchOptions={fetchTrainers}
              selectedOption={selectedTrainer}
              placeholder="Search trainer"
            />

            <LookupSelect
              label="Lecture Room"
              value={roomId}
              onChange={handleRoomChange}
              fetchOptions={fetchRooms}
              selectedOption={selectedRoom}
              required
              placeholder="Search room"
            />

            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">Day</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-[13px] placeholder:text-[#a8b6c7]"
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputClassName}
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={inputClassName}
                required
              />
            </div>
          </div>
        </div>

        {error ? (
          <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
        ) : null}

        <div className="flex justify-end">
          <FormButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEdit ? "Update Entry" : "Create Timetable Entry"}
          </FormButton>
        </div>
      </form>
    </section>
  );
}

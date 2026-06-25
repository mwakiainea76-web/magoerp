import { useCallback, useEffect, useRef, useState } from "react";
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

export function TimetableCreatePage() {
  const timetableApi = useTimetableApi();
  const courseCurriculaApi = useCourseCurriculaApi();

  const [courseCurriculumId, setCourseCurriculumId] = useState("");
  const [selectedCourseCurriculum, setSelectedCourseCurriculum] = useState(null);
  const [unitId, setUnitId] = useState("");
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [trainerId, setTrainerId] = useState("");
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const courseCurriculumIdRef = useRef(courseCurriculumId);
  useEffect(() => { courseCurriculumIdRef.current = courseCurriculumId; }, [courseCurriculumId]);

  const fetchCurricula = useCallback(async (query) => {
    const res = await courseCurriculaApi.list({ q: query, per_page: 200 });
    return (res.data ?? []).map((cc) => ({
      id: cc.id,
      label: `${cc.course_code} — ${cc.curriculum_name}`,
    }));
  }, []);

  const fetchUnits = useCallback(async (query) => {
    const id = courseCurriculumIdRef.current;
    if (!id) return [];
    const res = await timetableApi.availableUnits({ course_curriculum_id: id, q: query });
    return (res.data ?? []).map((u) => ({
      id: u.id,
      label: `${u.code} — ${u.name}`,
    }));
  }, []);

  const fetchTrainers = useCallback(async (query) => {
    const res = await timetableApi.staffList();
    const items = res.data ?? [];
    if (!query) return items.map((s) => ({ id: s.id, label: `${s.name} (${s.employee_number})` }));
    return items
      .filter((s) => s.name.toLowerCase().includes(query.toLowerCase()))
      .map((s) => ({ id: s.id, label: `${s.name} (${s.employee_number})` }));
  }, []);

  const fetchRooms = useCallback(async (query) => {
    const res = await timetableApi.lectureRooms();
    const items = res.data ?? [];
    if (!query) return items.map((r) => ({ id: r.id, label: `${r.name} (${r.code})${r.capacity ? ` - ${r.capacity} seats` : ""}` }));
    return items
      .filter((r) => r.name.toLowerCase().includes(query.toLowerCase()) || r.code.toLowerCase().includes(query.toLowerCase()))
      .map((r) => ({ id: r.id, label: `${r.name} (${r.code})${r.capacity ? ` - ${r.capacity} seats` : ""}` }));
  }, []);

  function handleCourseCurriculumChange(id, option) {
    setCourseCurriculumId(id ?? "");
    setSelectedCourseCurriculum(option);
    setUnitId("");
    setSelectedUnit(null);
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

    if (!courseCurriculumId || !unitId) {
      setError("Course curriculum and unit are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        unit_id: unitId,
        trainer_staff_id: trainerId || null,
        lecture_room_id: roomId || null,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
      };

      await timetableApi.create(payload);
      toast.success("Timetable entry created.");
      setUnitId("");
      setSelectedUnit(null);
      setTrainerId("");
      setSelectedTrainer(null);
      setRoomId("");
      setSelectedRoom(null);
      setStartTime("08:00");
      setEndTime("10:00");
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to create timetable entry."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Add Timetable Entry</h1>
        <p className="text-[13px] text-slate-500">Schedule a lecture, practical, or tutorial session</p>
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
            {isSubmitting ? "Creating..." : "Create Timetable Entry"}
          </FormButton>
        </div>
      </form>
    </section>
  );
}

import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import * as yup from "yup";

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

const timetableSchema = yup.object({
  course_curriculum_id: yup.string().required("Course curriculum is required"),
  unit_id: yup.string().required("Unit is required"),
  trainer_id: yup.string().nullable(),
  lecture_room_id: yup.string().required("Lecture room is required"),
  day_of_week: yup.number().required().min(0).max(6),
  start_time: yup.string().required("Start time is required"),
  end_time: yup.string().required("End time is required"),
});

export function TimetableCreatePage() {
  const { timetableId } = useParams();
  const isEdit = Boolean(timetableId);
  const navigate = useNavigate();
  const timetableApi = useTimetableApi();
  const courseCurriculaApi = useCourseCurriculaApi();
  const initialLoadDone = useRef(false);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [moduleFilter, setModuleFilter] = useState(0);
  const [selectedCourseCurriculum, setSelectedCourseCurriculum] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    setError,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(timetableSchema),
    defaultValues: {
      course_curriculum_id: "",
      unit_id: "",
      trainer_id: "",
      lecture_room_id: "",
      day_of_week: 0,
      start_time: "08:00",
      end_time: "10:00",
    },
  });

  const watchedCourseCurriculum = watch("course_curriculum_id");

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
    if (!watchedCourseCurriculum) return [];
    const params = { course_curriculum_id: watchedCourseCurriculum, q: query };
    if (moduleFilter) params.module = moduleFilter;
    const res = await timetableApi.availableUnits(params);
    return (res.data ?? []).map((u) => ({
      id: u.id,
      label: [u.code, u.name].filter(Boolean).join(" - "),
    }));
  }, [watchedCourseCurriculum, moduleFilter, timetableApi]);

  const fetchTrainers = useCallback(async (query) => {
    const res = await timetableApi.staffList();
    const items = res.data ?? [];
    if (!query) return items.map((s) => ({ id: s.id, label: `${s.name} (${s.employee_number})` }));
    const q = query.toLowerCase();
    return items
      .filter((s) => s.name.toLowerCase().includes(q) || s.employee_number.toLowerCase().includes(q))
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

        setSelectedCourseCurriculum(d.course_curriculum_id ? { id: d.course_curriculum_id, label: courseCurriculumLabel } : null);
        setSelectedUnit(d.unit_id ? { id: d.unit_id, label: unitLabel } : null);
        setSelectedTrainer(d.trainer_staff_id ? { id: d.trainer_staff_id, label: trainerLabel } : null);
        setSelectedRoom(d.lecture_room_id ? { id: d.lecture_room_id, label: roomLabel } : null);

        reset({
          course_curriculum_id: d.course_curriculum_id ?? "",
          unit_id: d.unit_id ?? "",
          trainer_id: d.trainer_staff_id ?? "",
          lecture_room_id: d.lecture_room_id ?? "",
          day_of_week: d.day_of_week ?? 0,
          start_time: formatClock(d.start_time, "08:00"),
          end_time: formatClock(d.end_time, "10:00"),
        });

        initialLoadDone.current = true;
      } catch (e) {
        if (mounted) setError("root", { message: getApiErrorMessage(e, "Failed to load timetable entry.") });
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [isEdit, timetableId, timetableApi, reset, setError]);

  function handleModuleFilterChange(e) {
    const value = Number(e.target.value);
    setModuleFilter(value);
    setValue("unit_id", "");
    setSelectedUnit(null);
  }

  async function onSubmit(data) {
    setIsSubmitting(true);
    try {
      const payload = {
        unit_id: data.unit_id,
        trainer_staff_id: data.trainer_id || null,
        lecture_room_id: data.lecture_room_id,
        day_of_week: data.day_of_week,
        start_time: data.start_time,
        end_time: data.end_time,
      };

      if (isEdit) {
        await timetableApi.update(timetableId, payload);
        toast.success("Timetable entry updated.");
      } else {
        await timetableApi.create(payload);
        toast.success("Timetable entry created.");
      }
    } catch (e) {
      const serverErrors = e?.response?.data?.errors;
      if (serverErrors) {
        Object.entries(serverErrors).forEach(([key, value]) => {
          setError(key, { message: value?.[0] ?? "Invalid value" });
        });
      } else {
        setError("root", { message: getApiErrorMessage(e, `Failed to ${isEdit ? "update" : "create"} timetable entry.`) });
      }
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

      {errors.root ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{errors.root.message}</div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Controller
              name="course_curriculum_id"
              control={control}
              render={({ field }) => (
                <LookupSelect
                  label="Course Curriculum"
                  value={field.value}
                  onChange={(nextValue, option) => {
                    field.onChange(nextValue);
                    setSelectedCourseCurriculum(option);
                    setValue("unit_id", "");
                    setSelectedUnit(null);
                    setModuleFilter(0);
                  }}
                  fetchOptions={fetchCurricula}
                  selectedOption={selectedCourseCurriculum}
                  required
                  placeholder="Search course curriculum"
                  error={errors.course_curriculum_id?.message}
                />
              )}
            />

            <div>
              <label htmlFor="module" className="mb-1 block text-[13px] font-medium text-slate-600">Module</label>
              <select
                id="module"
                value={moduleFilter}
                onChange={handleModuleFilterChange}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition"
                disabled={!watchedCourseCurriculum}
              >
                <option value={0}>All</option>
                <option value={1}>Module 1</option>
                <option value={2}>Module 2</option>
                <option value={3}>Module 3</option>
              </select>
            </div>

            <Controller
              name="unit_id"
              control={control}
              render={({ field }) => (
                <LookupSelect
                  label="Unit"
                  value={field.value}
                  onChange={(nextValue, option) => {
                    field.onChange(nextValue);
                    setSelectedUnit(option);
                  }}
                  fetchOptions={fetchUnits}
                  selectedOption={selectedUnit}
                  required
                  disabled={!watchedCourseCurriculum}
                  placeholder={watchedCourseCurriculum ? "Search unit" : "Select a curriculum first"}
                  error={errors.unit_id?.message}
                />
              )}
            />

            <Controller
              name="trainer_id"
              control={control}
              render={({ field }) => (
                <LookupSelect
                  label="Trainer"
                  value={field.value}
                  onChange={(nextValue, option) => {
                    field.onChange(nextValue);
                    setSelectedTrainer(option);
                  }}
                  fetchOptions={fetchTrainers}
                  selectedOption={selectedTrainer}
                  placeholder="Search trainer"
                />
              )}
            />

            <Controller
              name="lecture_room_id"
              control={control}
              render={({ field }) => (
                <LookupSelect
                  label="Lecture Room"
                  value={field.value}
                  onChange={(nextValue, option) => {
                    field.onChange(nextValue);
                    setSelectedRoom(option);
                  }}
                  fetchOptions={fetchRooms}
                  selectedOption={selectedRoom}
                  required
                  placeholder="Search room"
                  error={errors.lecture_room_id?.message}
                />
              )}
            />

            <div>
              <label htmlFor="day_of_week" className="mb-1 block text-[13px] font-medium text-slate-600">Day</label>
              <select id="day_of_week" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition" {...register("day_of_week")}>
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="start_time" className="mb-1 block text-[13px] font-medium text-slate-600">Start Time</label>
              <input id="start_time" type="time" className={inputClassName} {...register("start_time")} />
              {errors.start_time ? <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p> : null}
            </div>

            <div>
              <label htmlFor="end_time" className="mb-1 block text-[13px] font-medium text-slate-600">End Time</label>
              <input id="end_time" type="time" className={inputClassName} {...register("end_time")} />
              {errors.end_time ? <p className="mt-1 text-sm text-red-600">{errors.end_time.message}</p> : null}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <FormButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEdit ? "Update Entry" : "Create Timetable Entry"}
          </FormButton>
        </div>
      </form>
    </section>
  );
}

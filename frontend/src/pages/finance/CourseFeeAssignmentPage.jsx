import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Search, RefreshCw, FileText, Coins } from "lucide-react";
import toast from "react-hot-toast";
import * as yup from "yup";

import { FormInput } from "@/components/FormInput";
import { FormButton } from "@/components/FormButton";
import { LookupSelect } from "@/components/LookupSelect";
import { useFeeStructureApi } from "@/hooks/useFeeStructureApi";
import { useCurriculumFeeAssignmentsApi } from "@/hooks/useCurriculumFeeAssignmentsApi";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const schema = yup.object({
  assignment_scope: yup.string().oneOf(["course", "department"]).required(),
  course_curriculum_id: yup.string().when("assignment_scope", {
    is: "course",
    then: (field) => field.required("Course and curriculum are required"),
    otherwise: (field) => field.notRequired(),
  }),
  department_id: yup.string().when("assignment_scope", {
    is: "department",
    then: (field) => field.required("Department is required"),
    otherwise: (field) => field.notRequired(),
  }),
  issuance_type: yup.string().oneOf(["per_session", "per_year"]).required(),
  academic_year_id: yup.string().when("issuance_type", {
    is: "per_year",
    then: (field) => field.required("Academic year is required"),
    otherwise: (field) => field.notRequired(),
  }),
  session_number: yup.number().when("issuance_type", {
    is: "per_session",
    then: (field) =>
      field
        .transform((value, originalValue) => (originalValue === "" ? undefined : value))
        .required("Session number is required")
        .integer()
        .min(1)
        .max(4),
    otherwise: (field) => field.notRequired(),
  }),
  year_level: yup
    .number()
    .transform((value, originalValue) => (originalValue === "" ? undefined : value))
    .required("Year level is required")
    .integer()
    .min(0)
    .max(4),
  is_approved: yup.boolean(),
});

export function CourseFeeAssignmentPage() {
  const feeStructureApi = useFeeStructureApi();
  const assignmentsApi = useCurriculumFeeAssignmentsApi();
  const sessionsApi = useAcademicSessionsApi();
  const lookupApi = useLookupApi();

  const [structures, setStructures] = useState([]);
  const [loadingStructures, setLoadingStructures] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedStructure, setSelectedStructure] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [courseOption, setCourseOption] = useState(null);
  const [departmentOption, setDepartmentOption] = useState(null);
  const [ratios, setRatios] = useState([]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      assignment_scope: "course",
      course_curriculum_id: "",
      department_id: "",
      academic_year_id: "",
      year_level: "",
      is_approved: true,
    },
  });

  const assignmentScope = useWatch({ control, name: "assignment_scope" });
  const issuanceType = useWatch({ control, name: "issuance_type" });
  const selectedYearId = useWatch({ control, name: "academic_year_id" });

  const academicYears = useMemo(
    () =>
      [
        ...new Map(
          sessions.map((session) => [
            session.academic_year_id,
            {
              id: session.academic_year_id,
              name: session.academic_year_name,
              code: session.academic_year_code,
            },
          ]),
        ).values(),
      ],
    [sessions],
  );

  const yearSessions = useMemo(
    () =>
      sessions
        .filter(
          (session) => selectedYearId && session.academic_year_id === selectedYearId,
        )
        .sort((left, right) =>
          String(left.start_date ?? left.code).localeCompare(
            String(right.start_date ?? right.code),
          ),
        ),
    [sessions, selectedYearId],
  );

  useEffect(() => {
    if (yearSessions.length === 0) {
      setRatios([]);
      return;
    }
    const base = Number((100 / yearSessions.length).toFixed(2));
    const next = yearSessions.map((_, index) =>
      index === yearSessions.length - 1
        ? Number((100 - base * (yearSessions.length - 1)).toFixed(2))
        : base,
    );
    setRatios(next);
  }, [yearSessions]);

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

  useEffect(() => {
    loadStructures();
  }, [loadStructures]);

  useEffect(() => {
    sessionsApi
      .list({ per_page: 100, status: "all", sort_by: "start_date", sort_direction: "asc" })
      .then((res) => setSessions(res.data ?? []))
      .catch(() => {});
  }, [sessionsApi]);

  function handleSearch() {
    loadStructures(search.trim());
  }

  function handleReset() {
    setSearch("");
    loadStructures("");
  }

  function selectStructure(structure) {
    setSelectedStructure(structure);
    reset({
      assignment_scope: "course",
      course_curriculum_id: "",
      department_id: "",
      academic_year_id: "",
      year_level: "",
      is_approved: true,
    });
    setCourseOption(null);
    setDepartmentOption(null);
    setRatios([]);
  }

  function clearSelection() {
    setSelectedStructure(null);
  }

  async function fetchMappings(query) {
    const response = await lookupApi.search("course-curricula", { query, limit: 20 });
    return response.data ?? [];
  }

  async function fetchDepartments(query) {
    const response = await lookupApi.search("departments", { query, limit: 20 });
    return response.data ?? [];
  }

  async function submit(values) {
    if (!selectedStructure) return;

    if (
      values.issuance_type === "per_year" &&
      Math.abs(ratios.reduce((sum, ratio) => sum + Number(ratio || 0), 0) - 100) > 0.01
    ) {
      setError("root", { message: "Yearly split ratios must total exactly 100%." });
      return;
    }

    setSaving(true);
    try {
      await assignmentsApi.create(selectedStructure.id, {
        assignment_scope: values.assignment_scope,
        issuance_type: values.issuance_type,
        course_curriculum_id:
          values.assignment_scope === "course" ? values.course_curriculum_id : null,
        department_id:
          values.assignment_scope === "department" ? values.department_id : null,
        academic_year_id:
          values.issuance_type === "per_year" ? values.academic_year_id : null,
        year_level: Number(values.year_level),
        session_number:
          values.issuance_type === "per_session" ? Number(values.session_number) : null,
        split_ratios: values.issuance_type === "per_year" ? ratios.map(Number) : null,
        is_approved: Boolean(values.is_approved),
      });
      toast.success("Fee assignment created successfully.");
      reset({
        assignment_scope: "course",
        course_curriculum_id: "",
        department_id: "",
        academic_year_id: "",
        year_level: "",
        is_approved: true,
      });
      setCourseOption(null);
      setDepartmentOption(null);
    } catch (error) {
      const serverErrors = error?.response?.data?.errors;
      if (serverErrors) {
        Object.entries(serverErrors).forEach(([key, messages]) =>
          setError(key, { message: messages?.[0] }),
        );
      } else {
        toast.error(getApiErrorMessage(error, "Failed to create fee assignment."));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">
          Course Fee Assignment
        </h1>
        <p className="mt-1 text-[14px] text-slate-500">
          Assign fee structures to course curricula.
        </p>
      </div>

      {/* Search fee structures */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <FormInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search fee structures by name or code..."
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-[13px] font-medium text-white hover:bg-emerald-700"
        >
          <Search className="h-3.5 w-3.5" /> Search
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-[13px] text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      {/* Fee structures list */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {loadingStructures ? (
          <div className="space-y-2 p-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
            ))}
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
            {structures.map((structure) => {
              const isSelected = selectedStructure?.id === structure.id;
              return (
                <div
                  key={structure.id}
                  className={`flex items-center justify-between gap-4 px-5 py-4 transition ${
                    isSelected ? "bg-emerald-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-slate-900">
                      {structure.name}
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {structure.code} &middot; KES{" "}
                      {Number(structure.total_amount || 0).toLocaleString("en-KE", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      &middot; {structure.items_count} item
                      {structure.items_count !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      isSelected ? clearSelection() : selectStructure(structure)
                    }
                    className={`shrink-0 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition ${
                      isSelected
                        ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                  >
                    {isSelected ? "Selected" : "Select"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Assignment form */}
      {selectedStructure ? (
        <div className="rounded-2xl border border-sky-200/80 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Coins className="mt-0.5 h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <h2 className="text-[15px] font-semibold text-slate-900">
                  {selectedStructure.name}
                </h2>
                <p className="text-[12px] text-slate-500">
                  KES{" "}
                  {Number(selectedStructure.total_amount || 0).toLocaleString("en-KE", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  &middot; {selectedStructure.items_count} item
                  {selectedStructure.items_count !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-50"
            >
              Change
            </button>
          </div>

          <form onSubmit={handleSubmit(submit)} className="space-y-4">
            {errors.root ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {errors.root.message}
              </p>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-600">
                  Assign Fee By
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  {...register("assignment_scope")}
                >
                  <option value="course">Course and Curriculum</option>
                  <option value="department">Department</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-600">
                  Issuance Mode
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  {...register("issuance_type")}
                >
                  <option value="per_year">Per Academic Year</option>
                  <option value="per_session">Per Progression Session</option>
                </select>
              </div>

              {assignmentScope === "department" ? (
                <Controller
                  name="department_id"
                  control={control}
                  render={({ field }) => (
                    <LookupSelect
                      label="Department"
                      value={field.value}
                      selectedOption={departmentOption}
                      onChange={(value, option) => {
                        field.onChange(value);
                        setDepartmentOption(option);
                      }}
                      fetchOptions={fetchDepartments}
                      placeholder="Search department"
                      error={errors.department_id?.message}
                    />
                  )}
                />
              ) : (
                <Controller
                  name="course_curriculum_id"
                  control={control}
                  render={({ field }) => (
                    <LookupSelect
                      label="Course and Curriculum"
                      value={field.value}
                      selectedOption={courseOption}
                      onChange={(value, option) => {
                        field.onChange(value);
                        setCourseOption(option);
                      }}
                      fetchOptions={fetchMappings}
                      placeholder="Search course or curriculum"
                      error={errors.course_curriculum_id?.message}
                    />
                  )}
                />
              )}

              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-600">
                  Year Level
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                  {...register("year_level")}
                >
                  <option value="">Select year level</option>
                  <option value={0}>All Years</option>
                  {[1, 2, 3, 4].map((year) => (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  ))}
                </select>
                {errors.year_level ? (
                  <p className="mt-1 text-xs text-red-600">{errors.year_level.message}</p>
                ) : null}
              </div>

              {issuanceType === "per_year" ? (
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600">
                    Academic Year
                  </label>
                  <select
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    {...register("academic_year_id")}
                  >
                    <option value="">Select academic year</option>
                    {academicYears.map((year) => (
                      <option key={year.id} value={year.id}>
                        {year.name ?? year.code}
                      </option>
                    ))}
                  </select>
                  {errors.academic_year_id ? (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.academic_year_id.message}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600">
                    Progression Session
                  </label>
                  <select
                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    {...register("session_number")}
                  >
                    <option value="">Select session</option>
                    {[1, 2, 3, 4].map((session) => (
                      <option key={session} value={session}>
                        Session {session}
                      </option>
                    ))}
                  </select>
                  {errors.session_number ? (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.session_number.message}
                    </p>
                  ) : null}
                </div>
              )}
            </div>

            {issuanceType === "per_year" ? (
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                <p className="text-sm font-medium text-sky-900">Yearly split ratios</p>
                <p className="mt-1 text-xs text-sky-700">
                  One portion is stored for every progression session. All portions can be used
                  by active intakes.
                </p>
                {yearSessions.length ? (
                  <>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      {yearSessions.map((session, index) => (
                        <div key={session.id}>
                          <p className="text-xs text-slate-600">{session.name}</p>
                          <FormInput
                            type="number"
                            label="Ratio (%)"
                            min="0.01"
                            max="100"
                            step="0.01"
                            value={ratios[index] ?? ""}
                            onChange={(event) =>
                              setRatios((current) =>
                                current.map((ratio, ratioIndex) =>
                                  ratioIndex === index ? event.target.value : ratio,
                                ),
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs font-medium text-sky-800">
                      Total: {ratios.reduce((sum, ratio) => sum + Number(ratio || 0), 0).toFixed(2)}%
                    </p>
                  </>
                ) : (
                  <p className="mt-3 text-sm text-sky-700">
                    Select an academic year to configure its session ratios.
                  </p>
                )}
              </div>
            ) : null}

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" {...register("is_approved")} />
                Approve immediately
              </label>
              <FormButton type="submit" disabled={saving}>
                {saving ? "Saving..." : "Create Assignment"}
              </FormButton>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

export default CourseFeeAssignmentPage;

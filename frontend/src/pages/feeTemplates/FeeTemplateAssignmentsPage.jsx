import { useCallback, useEffect, useMemo, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ArrowLeft, BadgeCheck, Coins, Pencil } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import * as yup from "yup";

import { FormButton } from "@/components/FormButton";
import { LookupSelect } from "@/components/LookupSelect";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { useCurriculumFeeAssignmentsApi } from "@/hooks/useCurriculumFeeAssignmentsApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const money = (amount) => `Ksh ${Number(amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const schema = yup.object({
  assignment_scope: yup.string().oneOf(["course", "department"]).required(),
  course_curriculum_id: yup.string().when("assignment_scope", { is: "course", then: (field) => field.required("Course and curriculum are required"), otherwise: (field) => field.notRequired() }),
  department_id: yup.string().when("assignment_scope", { is: "department", then: (field) => field.required("Department is required"), otherwise: (field) => field.notRequired() }),
  academic_year_id: yup.string().required("Academic year is required"),
  year_level: yup.number().transform((value, originalValue) => originalValue === "" ? undefined : value).required("Year level is required").integer().min(0).max(4),
  is_approved: yup.boolean(),
});

export function FeeTemplateAssignmentsPage() {
  const { templateId } = useParams();
  const assignmentsApi = useCurriculumFeeAssignmentsApi();
  const sessionsApi = useAcademicSessionsApi();
  const lookupApi = useLookupApi();
  const [assignments, setAssignments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [template, setTemplate] = useState({ name: "", amount: 0, items: 0 });
  const [courseOption, setCourseOption] = useState(null);
  const [departmentOption, setDepartmentOption] = useState(null);
  const [ratios, setRatios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      assignment_scope: "course",
      course_curriculum_id: "",
      department_id: "",
      academic_year_id: "",
      year_level: "",
      is_approved: false,
    },
  });

  const assignmentScope = useWatch({ control, name: "assignment_scope" });
  const selectedYearId = useWatch({ control, name: "academic_year_id" });
  const selectedYearLevel = useWatch({ control, name: "year_level" });
  const academicYears = useMemo(() => [...new Map(sessions.map((session) => [
    session.academic_year_id,
    { id: session.academic_year_id, name: session.academic_year_name, code: session.academic_year_code },
  ])).values()], [sessions]);
  const yearSessions = useMemo(() => sessions
    .filter((session) => selectedYearId && session.academic_year_id === selectedYearId)
    .sort((left, right) => String(left.start_date ?? left.code).localeCompare(String(right.start_date ?? right.code))), [sessions, selectedYearId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [assignmentResponse, sessionResponse] = await Promise.all([
        assignmentsApi.list(templateId),
        sessionsApi.list({ per_page: 100, status: "all", sort_by: "start_date", sort_direction: "asc" }),
      ]);
      setAssignments(assignmentResponse.data ?? []);
      setSessions(sessionResponse.data ?? []);
      setTemplate({
        name: assignmentResponse.fee_template_name ?? "",
        amount: Number(assignmentResponse.fee_template_total_amount ?? 0),
        items: Number(assignmentResponse.fee_template_total_items ?? 0),
      });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load fee assignments."));
    } finally {
      setLoading(false);
    }
  }, [assignmentsApi, sessionsApi, templateId]);

  useEffect(() => {
    // The request updates state asynchronously; load also remains reusable after mutations.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useEffect(() => {
    if (yearSessions.length === 0) {
      // Synchronize editable ratios when issuance mode or the selected year changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRatios([]);
      return;
    }
    const base = Number((100 / yearSessions.length).toFixed(2));
    const next = yearSessions.map((_, index) => index === yearSessions.length - 1
      ? Number((100 - base * (yearSessions.length - 1)).toFixed(2))
      : base);
    setRatios(next);
  }, [issuanceType, yearSessions]);

  async function submit(values) {
    if (Math.abs(ratios.reduce((sum, ratio) => sum + Number(ratio || 0), 0) - 100) > 0.01) {
      setError("root", { message: "Yearly split ratios must total exactly 100%." });
      return;
    }

    setSaving(true);
    try {
      await assignmentsApi.create(templateId, {
        assignment_scope: values.assignment_scope,
        course_curriculum_id: values.assignment_scope === "course" ? values.course_curriculum_id : null,
        department_id: values.assignment_scope === "department" ? values.department_id : null,
        academic_year_id: values.academic_year_id,
        year_level: Number(values.year_level),
        split_ratios: ratios.map(Number),
        is_approved: Boolean(values.is_approved),
      });
      toast.success("Yearly fee split created.");
      reset({ assignment_scope: "course", course_curriculum_id: "", department_id: "", academic_year_id: "", year_level: "", is_approved: false });
      setCourseOption(null);
      setDepartmentOption(null);
      await load();
    } catch (error) {
      const serverErrors = error?.response?.data?.errors;
      if (serverErrors) Object.entries(serverErrors).forEach(([key, messages]) => setError(key, { message: messages?.[0] }));
      else toast.error(getApiErrorMessage(error, "Failed to create fee assignment."));
    } finally {
      setSaving(false);
    }
  }

  async function toggleApproval(assignment) {
    try {
      await assignmentsApi.update(templateId, assignment.id, { is_approved: !assignment.is_approved });
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update approval."));
    }
  }

  async function editDormant(portion) {
    const amount = window.prompt(`New amount for ${portion.academic_session_name}`, String(portion.split_amount));
    if (amount === null) return;
    const reason = window.prompt("Reason for changing this dormant portion");
    if (!reason) return;
    try {
      await assignmentsApi.update(templateId, portion.id, { split_amount: Number(amount), reason });
      toast.success("Dormant portions rebalanced and audited.");
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update dormant portion."));
    }
  }

  async function fetchMappings(query) {
    const response = await lookupApi.search("course-curricula", { query, limit: 20 });
    return response.data ?? [];
  }

  async function fetchDepartments(query) {
    const response = await lookupApi.search("departments", { query, limit: 20 });
    return response.data ?? [];
  }

  return (
    <section className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Fee Template: {template.name}</h1>
          <p className="mt-1 text-sm text-slate-500">{template.items} items · {money(template.amount)}</p>
        </div>
        <Link to="/finance/fee-templates" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"><ArrowLeft className="size-4" />Back</Link>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900"><Coins className="size-5 text-emerald-600" />Issue Course Fee</h2>
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          {errors.root ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors.root.message}</p> : null}
          <div className="grid gap-4 lg:grid-cols-2">
            <div><label className="mb-1 block text-[13px] font-medium text-slate-600">Assign Fee By</label><select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" {...register("assignment_scope")}><option value="course">Course and Curriculum</option><option value="department">Department</option></select></div>
            {assignmentScope === "department" ? <Controller name="department_id" control={control} render={({ field }) => <LookupSelect label="Department" value={field.value} selectedOption={departmentOption} onChange={(value, option) => { field.onChange(value); setDepartmentOption(option); }} fetchOptions={fetchDepartments} placeholder="Search department" error={errors.department_id?.message} />} /> : <Controller name="course_curriculum_id" control={control} render={({ field }) => <LookupSelect label="Course and Curriculum" value={field.value} selectedOption={courseOption} onChange={(value, option) => { field.onChange(value); setCourseOption(option); }} fetchOptions={fetchMappings} placeholder="Search course or curriculum" error={errors.course_curriculum_id?.message} />} />}
            <div><label className="mb-1 block text-[13px] font-medium text-slate-600">Year Level</label><select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" {...register("year_level")}><option value="">Select year level</option><option value={0}>All Years</option>{[1,2,3,4].map((year) => <option key={year} value={year}>Year {year}</option>)}</select>{errors.year_level ? <p className="mt-1 text-xs text-red-600">{errors.year_level.message}</p> : null}</div>
            <div><label className="mb-1 block text-[13px] font-medium text-slate-600">Academic Year</label><select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" {...register("academic_year_id")}><option value="">Select academic year</option>{academicYears.map((year) => <option key={year.id} value={year.id}>{year.name ?? year.code}</option>)}</select>{errors.academic_year_id ? <p className="mt-1 text-xs text-red-600">{errors.academic_year_id.message}</p> : null}</div>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4"><p className="text-sm font-medium text-sky-900">Yearly split ratios</p><p className="mt-1 text-xs text-sky-700">One portion is stored for every session. Future portions remain dormant.</p>{yearSessions.length ? <><div className="mt-3 grid gap-3 sm:grid-cols-3">{yearSessions.map((session, index) => <label key={session.id} className="text-xs text-slate-600">{session.name}<div className="mt-1 flex items-center"><input type="number" min="0.01" max="100" step="0.01" value={ratios[index] ?? ""} onChange={(event) => setRatios((current) => current.map((ratio, ratioIndex) => ratioIndex === index ? event.target.value : ratio))} className="h-9 w-full rounded-l-lg border border-slate-200 px-3 text-sm" /><span className="rounded-r-lg border border-l-0 border-slate-200 bg-white px-3 py-2">%</span></div></label>)}</div><p className="mt-2 text-xs font-medium text-sky-800">Total: {ratios.reduce((sum, ratio) => sum + Number(ratio || 0), 0).toFixed(2)}%</p></> : <p className="mt-3 text-sm text-sky-700">Select an academic year to configure its session ratios.</p>}</div>

          <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" {...register("is_approved")} />Approve immediately</label><FormButton type="submit" disabled={saving}>{saving ? "Saving..." : "Create Assignment"}</FormButton></div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Existing Assignments</h2></div>
        {loading ? <p className="p-5 text-sm text-slate-500">Loading...</p> : assignments.length === 0 ? <p className="p-5 text-sm text-slate-500">No assignments yet.</p> : <div className="divide-y divide-slate-100">{assignments.map((assignment) => <div key={assignment.id} className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium text-slate-900">{assignment.assignment_target_name} · {assignment.year_level === 0 ? "All Years" : `Year ${assignment.year_level}`}</p><p className="mt-1 text-xs text-slate-500">Academic year · {money(assignment.split_amount)}</p></div><button type="button" onClick={() => toggleApproval(assignment)} className={`rounded-full px-3 py-1 text-xs font-semibold ${assignment.is_approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{assignment.is_approved ? <span className="inline-flex items-center gap-1"><BadgeCheck className="size-3" />Approved</span> : "Pending"}</button></div>{assignment.issuance_type === "per_year" ? <div className="mt-4 grid gap-3 md:grid-cols-3">{(assignment.child_assignments ?? []).map((portion) => <div key={portion.id} className="rounded-xl border border-slate-200 p-3"><div className="flex justify-between gap-2"><div><p className="text-sm font-medium text-slate-800">{portion.academic_session_name}</p><p className="text-xs text-slate-500">{portion.split_ratio}% · {money(portion.split_amount)}</p></div>{portion.dormant ? <button type="button" onClick={() => editDormant(portion)} className="rounded-lg p-2 text-sky-600 hover:bg-sky-50" title="Edit dormant portion"><Pencil className="size-4" /></button> : null}</div><span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${portion.dormant ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>{portion.dormant ? "Dormant" : "Active"}</span></div>)}</div> : null}</div>)}</div>}
      </div>
    </section>
  );
}

export default FeeTemplateAssignmentsPage;
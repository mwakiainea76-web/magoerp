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
  course_curriculum_id: yup.string().required("Course and curriculum are required"),
  academic_session_id: yup.string().required("Academic session is required"),
  issuance_type: yup.string().oneOf(["per_session", "per_year"]).required(),
  year_level: yup.number().integer().min(1).required(),
  session_number: yup.number().integer().min(1).nullable(),
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
  const [ratios, setRatios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      course_curriculum_id: "",
      academic_session_id: "",
      issuance_type: "per_session",
      year_level: 1,
      session_number: 1,
      is_approved: false,
    },
  });

  const issuanceType = useWatch({ control, name: "issuance_type" });
  const selectedSessionId = useWatch({ control, name: "academic_session_id" });
  const selectedSession = sessions.find((session) => session.id === selectedSessionId);
  const yearSessions = useMemo(() => sessions
    .filter((session) => selectedSession && session.academic_year_id === selectedSession.academic_year_id)
    .sort((left, right) => String(left.start_date ?? left.code).localeCompare(String(right.start_date ?? right.code))), [sessions, selectedSession]);

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
    if (issuanceType !== "per_year" || yearSessions.length === 0) {
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
    if (issuanceType === "per_year" && Math.abs(ratios.reduce((sum, ratio) => sum + Number(ratio || 0), 0) - 100) > 0.01) {
      setError("root", { message: "Yearly split ratios must total exactly 100%." });
      return;
    }

    setSaving(true);
    try {
      await assignmentsApi.create(templateId, {
        course_curriculum_id: values.course_curriculum_id,
        academic_session_id: values.academic_session_id,
        issuance_type: values.issuance_type,
        year_level: Number(values.year_level),
        session_number: values.issuance_type === "per_session" ? Number(values.session_number) : null,
        split_ratios: values.issuance_type === "per_year" ? ratios.map(Number) : null,
        is_approved: Boolean(values.is_approved),
      });
      toast.success(values.issuance_type === "per_year" ? "Yearly fee split created." : "Session fee assigned.");
      reset({ course_curriculum_id: "", academic_session_id: "", issuance_type: "per_session", year_level: 1, session_number: 1, is_approved: false });
      setCourseOption(null);
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
            <Controller name="course_curriculum_id" control={control} render={({ field }) => (
              <LookupSelect label="Course and Curriculum" value={field.value} selectedOption={courseOption} onChange={(value, option) => { field.onChange(value); setCourseOption(option); }} fetchOptions={fetchMappings} placeholder="Search course or curriculum" error={errors.course_curriculum_id?.message} />
            )} />
            <div><label className="mb-1 block text-[13px] font-medium text-slate-600">Academic Session</label><select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" {...register("academic_session_id")}><option value="">Select session</option>{sessions.map((session) => <option key={session.id} value={session.id}>{session.academic_year_name} · {session.name}{session.is_active ? " (Active)" : ""}</option>)}</select>{errors.academic_session_id ? <p className="mt-1 text-xs text-red-600">{errors.academic_session_id.message}</p> : null}</div>
            <div><label className="mb-1 block text-[13px] font-medium text-slate-600">Issuance Mode</label><select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" {...register("issuance_type")}><option value="per_session">Per Session</option><option value="per_year">Per Academic Year</option></select></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-[13px] font-medium text-slate-600">Year Level</label><select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" {...register("year_level")}>{[1,2,3,4,5,6].map((year) => <option key={year} value={year}>Year {year}</option>)}</select></div>{issuanceType === "per_session" ? <div><label className="mb-1 block text-[13px] font-medium text-slate-600">Session Number</label><select className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" {...register("session_number")}>{sessions.filter((session) => !selectedSession || session.academic_year_id === selectedSession.academic_year_id).map((_, index) => <option key={index + 1} value={index + 1}>Session {index + 1}</option>)}</select></div> : null}</div>
          </div>

          {issuanceType === "per_year" && yearSessions.length ? <div className="rounded-xl border border-sky-200 bg-sky-50 p-4"><p className="text-sm font-medium text-sky-900">Yearly split ratios</p><p className="mt-1 text-xs text-sky-700">One portion is stored for every session. Future portions remain dormant.</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{yearSessions.map((session, index) => <label key={session.id} className="text-xs text-slate-600">{session.name}<div className="mt-1 flex items-center"><input type="number" min="0.01" max="100" step="0.01" value={ratios[index] ?? ""} onChange={(event) => setRatios((current) => current.map((ratio, ratioIndex) => ratioIndex === index ? event.target.value : ratio))} className="h-9 w-full rounded-l-lg border border-slate-200 px-3 text-sm" /><span className="rounded-r-lg border border-l-0 border-slate-200 bg-white px-3 py-2">%</span></div></label>)}</div><p className="mt-2 text-xs font-medium text-sky-800">Total: {ratios.reduce((sum, ratio) => sum + Number(ratio || 0), 0).toFixed(2)}%</p></div> : null}

          <div className="flex items-center justify-between"><label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" {...register("is_approved")} />Approve immediately</label><FormButton type="submit" disabled={saving}>{saving ? "Saving..." : "Create Assignment"}</FormButton></div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-semibold text-slate-900">Existing Assignments</h2></div>
        {loading ? <p className="p-5 text-sm text-slate-500">Loading...</p> : assignments.length === 0 ? <p className="p-5 text-sm text-slate-500">No assignments yet.</p> : <div className="divide-y divide-slate-100">{assignments.map((assignment) => <div key={assignment.id} className="p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-medium text-slate-900">{assignment.course_name} · Year {assignment.year_level}</p><p className="mt-1 text-xs text-slate-500">{assignment.issuance_type === "per_year" ? `Academic year · ${money(assignment.split_amount)}` : `${assignment.academic_session_name} · Session ${assignment.session_number}`}</p></div><button type="button" onClick={() => toggleApproval(assignment)} className={`rounded-full px-3 py-1 text-xs font-semibold ${assignment.is_approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{assignment.is_approved ? <span className="inline-flex items-center gap-1"><BadgeCheck className="size-3" />Approved</span> : "Pending"}</button></div>{assignment.issuance_type === "per_year" ? <div className="mt-4 grid gap-3 md:grid-cols-3">{(assignment.child_assignments ?? []).map((portion) => <div key={portion.id} className="rounded-xl border border-slate-200 p-3"><div className="flex justify-between gap-2"><div><p className="text-sm font-medium text-slate-800">{portion.academic_session_name}</p><p className="text-xs text-slate-500">{portion.split_ratio}% · {money(portion.split_amount)}</p></div>{portion.dormant ? <button type="button" onClick={() => editDormant(portion)} className="rounded-lg p-2 text-sky-600 hover:bg-sky-50" title="Edit dormant portion"><Pencil className="size-4" /></button> : null}</div><span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${portion.dormant ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>{portion.dormant ? "Dormant" : "Active"}</span></div>)}</div> : null}</div>)}</div>}
      </div>
    </section>
  );
}

export default FeeTemplateAssignmentsPage;
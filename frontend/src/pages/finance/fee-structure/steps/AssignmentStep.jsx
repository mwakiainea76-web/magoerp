import { Controller, useFormContext, useWatch } from "react-hook-form";
import { SearchSelect } from "@/components/SearchSelect";
import { selectClassName } from "@/lib/styles";

const ErrorText = ({ children }) => children ? <p className="mt-1 text-sm text-red-600">{children}</p> : null;

export function AssignmentStep({ lookups }) {
  const { control, register, setValue, formState: { errors } } = useFormContext();
  const scope = useWatch({ control, name: "assignment_scope" });
  const issuance = useWatch({ control, name: "issuance_type" });
  const chooseScope = value => {
    setValue("assignment_scope", value, { shouldValidate: true });
    if (value !== "course") setValue("course_curriculum_id", "");
    if (value !== "department") setValue("department_id", "");
  };
  return (
    <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <h2 className="text-[15px] font-semibold text-slate-900">Assignment Configuration</h2>
      <div><label className="mb-1 block text-[13px] font-medium text-slate-700">Academic Session *</label><p className="mb-1 text-[12px] text-slate-400">Select the session this fee structure will be effective for.</p><Controller name="academic_session_id" control={control} render={({ field }) => <SearchSelect placeholder="Select academic session" options={lookups.sessions} value={field.value} onChange={field.onChange} />} /><ErrorText>{errors.academic_session_id?.message}</ErrorText></div>
      <div><label className="mb-1.5 block text-[13px] font-medium text-slate-700">Assign By *</label><div className="flex gap-3">{[["course", "Course"], ["department", "Department"], ["all", "All Courses"]].map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 hover:border-emerald-400 ${scope === value ? "border-emerald-500 bg-emerald-50" : "border-slate-300"}`}><input type="radio" checked={scope === value} onChange={() => chooseScope(value)} className="accent-emerald-600" /><span className="whitespace-nowrap text-[13px]">{label}</span></label>)}</div></div>
      {scope === "course" && <div><label className="mb-1 block text-[13px] font-medium text-slate-700">Course *</label><Controller name="course_curriculum_id" control={control} render={({ field }) => <SearchSelect placeholder="Select course" options={lookups.curricula} value={field.value} onChange={field.onChange} />} /><ErrorText>{errors.course_curriculum_id?.message}</ErrorText></div>}
      {scope === "department" && <div><label className="mb-1 block text-[13px] font-medium text-slate-700">Department *</label><Controller name="department_id" control={control} render={({ field }) => <SearchSelect placeholder="Select department" options={lookups.departments} value={field.value} onChange={field.onChange} />} /><ErrorText>{errors.department_id?.message}</ErrorText></div>}
      <div><label className="mb-1 block text-[13px] font-medium text-slate-700">Year Level *</label><select className={selectClassName} {...register("year_level")}><option value="">Select year</option><option value="0">All Years</option>{[1,2,3,4].map(year => <option key={year} value={year}>Year {year}</option>)}</select><ErrorText>{errors.year_level?.message}</ErrorText></div>
      <div><label className="mb-1.5 block text-[13px] font-medium text-slate-700">Issue *</label><div className="flex gap-4">{[["per_session", "Once per Session"], ["per_year", "Every Session (Split across year)"]].map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 hover:border-emerald-400 ${issuance === value ? "border-emerald-500 bg-emerald-50" : "border-slate-300"}`}><input type="radio" value={value} className="accent-emerald-600" {...register("issuance_type")} /><span className="text-[13px]">{label}</span></label>)}</div></div>
      {issuance === "per_session" && <div><label className="mb-1 block text-[13px] font-medium text-slate-700">Session Number *</label><select className={selectClassName} {...register("session_number")}><option value="1">Session 1</option><option value="2">Session 2</option><option value="3">Session 3</option></select><ErrorText>{errors.session_number?.message}</ErrorText></div>}
    </div>
  );
}

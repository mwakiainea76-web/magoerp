import { useFormContext, useWatch } from "react-hook-form";

export function ReviewStep({ lookups, preview }) {
  const { control } = useFormContext();
  const form = useWatch({ control });
  const items = form.items || [];
  const total = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const scopeOption = form.assignment_scope === "course" ? lookups.curricula.find(option => option.id === form.course_curriculum_id) : form.assignment_scope === "department" ? lookups.departments.find(option => option.id === form.department_id) : null;
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <h2 className="text-[15px] font-semibold text-slate-900">Review &amp; Confirm</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Summary title="Fee Structure"><p className="text-[15px] font-semibold text-slate-900">{form.name || "—"}</p><p className="text-[12px] text-slate-400">Code: {form.code || "—"}</p></Summary>
        <Summary title="Total Amount"><p className="text-[15px] font-semibold text-emerald-700">KES {total.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</p><p className="text-[12px] text-slate-400">{items.length} item(s)</p></Summary>
        <Summary title="Assignment Summary"><p className="text-[13px] text-slate-700">Scope: {form.assignment_scope === "all" ? "All Courses" : scopeOption?.label || "—"}</p><p className="text-[12px] text-slate-400">{form.year_level === "0" ? "All Years" : `Year ${form.year_level}`}</p></Summary>
        <Summary title="Issue"><p className="text-[13px] text-slate-700">{form.issuance_type === "per_session" ? `Once in Session ${form.session_number}` : "Split across all sessions"}</p></Summary>
      </div>
      {preview?.generated_assignments && <Summary title="Generated Assignments">{preview.generated_assignments.map((assignment, index) => <div key={index} className="flex justify-between text-[13px]"><span className="text-slate-600">{assignment.session}</span><span className="font-medium text-slate-900">KES {assignment.amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span></div>)}</Summary>}
    </div>
  );
}

function Summary({ title, children }) { return <div className="rounded-xl border border-slate-200 p-4"><h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-slate-500">{title}</h3>{children}</div>; }

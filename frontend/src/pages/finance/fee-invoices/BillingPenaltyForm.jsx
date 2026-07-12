import { FormInput } from "@/components/FormInput";
import { LookupSelect } from "@/components/LookupSelect";
import { BillingFormShell } from "./BillingFormShell";

const textareaClassName = "h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-[13px] placeholder:text-[#a8b6c7] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

export function BillingPenaltyForm({ action, form, onSubmit, onCancel, isSaving, formError, selectedStudent, onStudentChange, fetchStudents }) {
  return (
    <BillingFormShell
      icon={action.icon}
      title={action.title}
      description={action.description}
      formId="penalty-form"
      onCancel={onCancel}
      isSaving={isSaving}
      submitLabel="Create Penalty Invoice"
      savingLabel="Creating..."
      error={formError}
    >
      <form id="penalty-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <LookupSelect
            label="Student"
            placeholder="Search by admission number or name"
            required
            value={form.watch("penalty_student_id")}
            selectedOption={selectedStudent}
            onChange={onStudentChange}
            fetchOptions={fetchStudents}
            error={form.formState.errors.penalty_student_id?.message}
          />
          <FormInput
            id="penalty-amount"
            label="Penalty Amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            error={form.formState.errors.penalty_amount?.message}
            {...form.register("penalty_amount")}
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-600">Description</label>
          <textarea className={textareaClassName} placeholder="Reason for penalty..." {...form.register("penalty_description")} />
        </div>
      </form>
    </BillingFormShell>
  );
}

import { LookupSelect } from "@/components/LookupSelect";
import { SearchSelect } from "@/components/SearchSelect";
import { BillingFormShell } from "./BillingFormShell";

const textareaClassName = "h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-[13px] placeholder:text-[#a8b6c7] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

export function BillingFeeForm({ action, form, onSubmit, onCancel, isSaving, formError, selectedStudent, setSelectedStudent, fetchStudents, feeTemplates, isLoadingTemplates, formatCurrency }) {
  const selectedTemplateId = form.watch("fee_structure_id");
  const selectedTemplate = feeTemplates.find((template) => template.id === selectedTemplateId);

  return (
    <BillingFormShell
      icon={action.icon}
      title={action.title}
      description={action.description}
      formId="fee-form"
      onCancel={onCancel}
      isSaving={isSaving}
      submitLabel="Issue Fee"
      savingLabel="Creating..."
      error={formError}
    >
      <form id="fee-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <LookupSelect
            label="Student"
            placeholder="Search by admission number or name"
            required
            value={form.watch("fee_student_id")}
            selectedOption={selectedStudent}
            onChange={(id, option) => {
              form.setValue("fee_student_id", id, { shouldValidate: true });
              setSelectedStudent(option ?? null);
            }}
            fetchOptions={fetchStudents}
            error={form.formState.errors.fee_student_id?.message}
          />
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-600">
              Fee Template <span className="text-red-400">*</span>
            </label>
            <SearchSelect
              options={feeTemplates.map((template) => ({ ...template, label: `${template.code} - ${template.name}` }))}
              value={selectedTemplateId}
              onChange={(id) => form.setValue("fee_structure_id", id, { shouldValidate: true })}
              placeholder={isLoadingTemplates ? "Loading..." : "Search fee template"}
              emptyMessage="No fee templates found"
            />
            {form.formState.errors.fee_structure_id?.message ? <p className="mt-1 text-sm text-red-600">{form.formState.errors.fee_structure_id.message}</p> : null}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-600">Amount</label>
            <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-[14px] font-semibold text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              {selectedTemplate ? formatCurrency(selectedTemplate.total_amount) : "Select a fee template"}
            </div>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-600">Description</label>
          <textarea className={textareaClassName} placeholder="Reason for this fee..." {...form.register("fee_description")} />
        </div>
      </form>
    </BillingFormShell>
  );
}

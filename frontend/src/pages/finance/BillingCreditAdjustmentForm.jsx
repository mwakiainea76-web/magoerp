import { FormInput } from "@/components/FormInput";
import { LookupSelect } from "@/components/LookupSelect";
import { BillingFormShell } from "./BillingFormShell";

const textareaClassName = "h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-[13px] placeholder:text-[#a8b6c7] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";
const selectClassName = "h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

export function BillingCreditAdjustmentForm({ action, form, onSubmit, onCancel, isSaving, formError, selectedStudent, onStudentChange, fetchStudents, invoices, isFetchingInvoices, formatCurrency }) {
  return (
    <BillingFormShell
      icon={action.icon}
      title={action.title}
      description={action.description}
      formId="ca-form"
      onCancel={onCancel}
      isSaving={isSaving}
      submitLabel="Apply"
      savingLabel="Applying..."
      error={formError}
    >
      <form id="ca-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <LookupSelect
            label="Student"
            placeholder="Search by admission number or name"
            required
            value={form.watch("ca_student_id")}
            selectedOption={selectedStudent}
            onChange={onStudentChange}
            fetchOptions={fetchStudents}
            error={form.formState.errors.ca_student_id?.message}
          />
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-600">
              Type <span className="text-red-400">*</span>
            </label>
            <select className={selectClassName} {...form.register("ca_type")}>
              <option value="discount">Discount</option>
              <option value="waiver">Waiver</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-600">
              Invoice <span className="text-red-400">*</span>
            </label>
            <select className={selectClassName} {...form.register("ca_invoice_id")} disabled={isFetchingInvoices || invoices.length === 0}>
              <option value="">
                {isFetchingInvoices
                  ? "Loading invoices..."
                  : invoices.length === 0 && form.watch("ca_student_id")
                    ? "No outstanding invoices"
                    : "Select an invoice"}
              </option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoice_number} - {formatCurrency(invoice.balance_due)} due
                </option>
              ))}
            </select>
            {form.formState.errors.ca_invoice_id?.message ? <p className="mt-1 text-sm text-red-600">{form.formState.errors.ca_invoice_id.message}</p> : null}
          </div>
          <FormInput
            id="ca-amount"
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            error={form.formState.errors.ca_amount?.message}
            {...form.register("ca_amount")}
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-600">Description</label>
          <textarea className={textareaClassName} placeholder="Reason for this adjustment..." {...form.register("ca_description")} />
        </div>
      </form>
    </BillingFormShell>
  );
}


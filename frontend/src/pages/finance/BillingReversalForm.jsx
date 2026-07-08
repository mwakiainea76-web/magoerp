import { LookupSelect } from "@/components/LookupSelect";
import { BillingFormShell } from "./BillingFormShell";

const textareaClassName = "h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-[13px] placeholder:text-[#a8b6c7] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";
const selectClassName = "h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

export function BillingReversalForm({ action, form, onSubmit, onCancel, isSaving, formError, selectedStudent, onStudentChange, fetchStudents, invoices, selectedBalance, isFetchingInvoices, onInvoiceChange, formatCurrency }) {
  return (
    <BillingFormShell
      icon={action.icon}
      title={action.title}
      description={action.description}
      formId="rev-form"
      onCancel={onCancel}
      isSaving={isSaving}
      submitLabel="Reverse Invoice"
      savingLabel="Reversing..."
      error={formError}
    >
      <form id="rev-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <LookupSelect
            label="Student"
            placeholder="Search by admission number or name"
            required
            value={form.watch("rev_student_id")}
            selectedOption={selectedStudent}
            onChange={onStudentChange}
            fetchOptions={fetchStudents}
            error={form.formState.errors.rev_student_id?.message}
          />
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-600">
              Invoice <span className="text-red-400">*</span>
            </label>
            <select className={selectClassName} value={form.watch("rev_invoice_id")} onChange={(event) => onInvoiceChange(event.target.value)} disabled={isFetchingInvoices || invoices.length === 0}>
              <option value="">
                {isFetchingInvoices
                  ? "Loading invoices..."
                  : invoices.length === 0 && form.watch("rev_student_id")
                    ? "No invoices found"
                    : "Select an invoice"}
              </option>
              {invoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoice_number} - {formatCurrency(invoice.balance_due)} outstanding
                </option>
              ))}
            </select>
            {form.formState.errors.rev_invoice_id?.message ? <p className="mt-1 text-sm text-red-600">{form.formState.errors.rev_invoice_id.message}</p> : null}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-600">Reversal Amount</label>
            <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-[14px] font-semibold text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              {selectedBalance > 0 ? formatCurrency(selectedBalance) : "Select an invoice"}
            </div>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-600">
            Reason <span className="text-red-400">*</span>
          </label>
          <textarea className={textareaClassName} placeholder="Reason for reversal..." {...form.register("rev_reason")} />
        </div>
      </form>
    </BillingFormShell>
  );
}

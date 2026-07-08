import { FormInput } from "@/components/FormInput";
import { LookupSelect } from "@/components/LookupSelect";
import { BillingFormShell } from "./BillingFormShell";

const paymentMethods = [
  { value: "M-Pesa", label: "M-Pesa" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Cash", label: "Cash" },
  { value: "Cheque", label: "Cheque" },
  { value: "Airtel Money", label: "Airtel Money" },
];

const textareaClassName = "h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-[13px] placeholder:text-[#a8b6c7] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";
const selectClassName = "h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

export function BillingPaymentForm({ action, form, onSubmit, onCancel, isSaving, formError, selectedStudent, setSelectedStudent, fetchStudents }) {
  return (
    <BillingFormShell
      icon={action.icon}
      title={action.title}
      description={action.description}
      formId="payment-form"
      onCancel={onCancel}
      isSaving={isSaving}
      submitLabel="Record Payment"
      savingLabel="Recording..."
      error={formError}
    >
      <form id="payment-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <LookupSelect
            label="Student"
            placeholder="Search by admission number or name"
            required
            value={form.watch("student_id")}
            selectedOption={selectedStudent}
            onChange={(id, option) => {
              form.setValue("student_id", id, { shouldValidate: true });
              setSelectedStudent(option ?? null);
            }}
            fetchOptions={fetchStudents}
            error={form.formState.errors.student_id?.message}
          />
          <FormInput
            id="payment-amount"
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="0.00"
            error={form.formState.errors.amount?.message}
            {...form.register("amount")}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-600">
              Payment Method <span className="text-red-400">*</span>
            </label>
            <select className={selectClassName} {...form.register("method")}>
              <option value="">Select method</option>
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>
            {form.formState.errors.method?.message ? <p className="mt-1 text-sm text-red-600">{form.formState.errors.method.message}</p> : null}
          </div>
          <FormInput
            id="payment-reference"
            label="Reference"
            required
            placeholder="Transaction code or receipt number"
            error={form.formState.errors.reference?.message}
            {...form.register("reference")}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormInput
            id="payment-date"
            label="Payment Date"
            type="date"
            required
            error={form.formState.errors.payment_date?.message}
            {...form.register("payment_date")}
          />
        </div>
        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-600">Notes</label>
          <textarea className={textareaClassName} placeholder="Optional notes..." {...form.register("notes")} />
        </div>
      </form>
    </BillingFormShell>
  );
}


import { FormInput } from "@/components/FormInput";
import { LookupSelect } from "@/components/LookupSelect";
import { BillingFormShell } from "./BillingFormShell";

const textareaClassName = "h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-[13px] placeholder:text-[#a8b6c7] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

export function BillingRefundForm({ action, form, onSubmit, onCancel, isSaving, formError, selectedStudent, setSelectedStudent, fetchGraduatedStudents, fetchStudentCredit, creditBalance, isFetchingCredit, setCreditBalance, formatCurrency }) {
  const isGraduated = selectedStudent?.status === "graduated";

  return (
    <BillingFormShell
      icon={action.icon}
      title={action.title}
      description={action.description}
      formId="refund-form"
      onCancel={onCancel}
      isSaving={isSaving}
      submitLabel="Process Refund"
      savingLabel="Processing..."
      error={formError}
      submitDisabled={!isGraduated || creditBalance <= 0}
    >
      <form id="refund-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <LookupSelect
            label="Student"
            placeholder="Search graduated student by admission number or name"
            required
            value={form.watch("refund_student_id")}
            selectedOption={selectedStudent}
            onChange={(id, option) => {
              form.setValue("refund_student_id", id, { shouldValidate: true });
              setSelectedStudent(option ?? null);
              if (option?.status === "graduated") {
                fetchStudentCredit(id);
              } else {
                setCreditBalance(0);
              }
            }}
            fetchOptions={fetchGraduatedStudents}
            error={form.formState.errors.refund_student_id?.message}
          />
        </div>
        {isGraduated ? (
          <>
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
              <p className="text-[13px] text-sky-700">
                Available Credit: <span className="font-semibold">{isFetchingCredit ? "Loading..." : formatCurrency(creditBalance)}</span>
              </p>
              {creditBalance <= 0 && !isFetchingCredit ? <p className="mt-1 text-[12px] text-sky-600">This student has no available credit to refund.</p> : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-600">Refund Amount</label>
                <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-[14px] font-semibold text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  {isFetchingCredit ? "Calculating..." : creditBalance > 0 ? formatCurrency(creditBalance) : "No credit available"}
                </div>
              </div>
              <FormInput
                id="refund-invoice"
                label="Invoice (optional)"
                placeholder="Leave blank for general refund"
                error={form.formState.errors.refund_invoice_id?.message}
                {...form.register("refund_invoice_id")}
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">Reason</label>
              <textarea className={textareaClassName} placeholder="Reason for refund..." {...form.register("refund_reason")} />
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-[13px] text-slate-600">Refund details are available only after selecting a student marked <strong>Graduated</strong>.</p>
          </div>
        )}
      </form>
    </BillingFormShell>
  );
}

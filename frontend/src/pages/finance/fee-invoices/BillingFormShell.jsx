import { FormButton } from "@/components/FormButton";
import { bodyTextClassName } from "@/lib/styles";

export function BillingFormShell({ icon: Icon, title, description, formId, onCancel, isSaving, submitLabel, savingLabel, error, children, submitDisabled = false }) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50/50 text-emerald-700">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-slate-800">{title}</h2>
            <p className="mt-1 text-[13px] leading-5 text-slate-500">{description}</p>
          </div>
        </div>
        <FormButton type="button" variant="secondary" onClick={onCancel} disabled={isSaving} className="shrink-0">
          Close
        </FormButton>
      </div>

      <div className="px-5 py-5">
        {error ? (
          <div className={`mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>
            {error}
          </div>
        ) : null}
        {children}
      </div>

      <div className="flex justify-end gap-3 border-t border-slate-100 px-5 py-4">
        <FormButton type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
          Cancel
        </FormButton>
        <FormButton type="submit" form={formId} disabled={isSaving || submitDisabled}>
          {isSaving ? savingLabel : submitLabel}
        </FormButton>
      </div>
    </div>
  );
}



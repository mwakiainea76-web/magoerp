import * as yup from "yup";

import { FormInput } from "@/components/FormInput";
import {
  bodyTextClassName,
  labelClassName,
  textAreaClassName,
} from "@/lib/styles";

export const feeTemplateItemSchema = yup.object({
  name: yup
    .string()
    .required("Component name is required")
    .max(255, "Component name must be at most 255 characters"),
  amount: yup
    .number()
    .typeError("Amount must be a valid number")
    .required("Amount is required")
    .min(0, "Amount must be at least 0"),
  description: yup
    .string()
    .nullable()
    .max(2000, "Description must be at most 2000 characters"),
  is_active: yup.boolean().required(),
});

export const defaultFeeTemplateItemValues = {
  name: "",
  amount: "",
  description: "",
  is_active: true,
};

export function normalizeFeeTemplateItemPayload(values, templateId) {
  return {
    fee_template_id: templateId,
    name: values.name.trim(),
    amount: Number(values.amount),
    description: values.description?.trim() || null,
    is_active: Boolean(values.is_active),
  };
}

export function FeeTemplateItemForm({
  formId = "fee-template-item-form",
  onSubmit,
  register,
  errors,
  loading = false,
  formError = "",
  templateField = null,
  footer = null,
  amountLocked = false,
}) {
  if (loading) {
    return (
      <div className={`py-6 text-slate-500 ${bodyTextClassName}`}>
        Loading component details...
      </div>
    );
  }

  return (
    <form id={formId} className="space-y-4" onSubmit={onSubmit}>
      {templateField}

      {formError ? (
        <div
          className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}
        >
          {formError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <FormInput
          id="name"
          label="Component Name"
          placeholder="e.g. Admission Fee"
          required
          error={errors.name?.message}
          {...register("name")}
        />

        <FormInput
          id="amount"
          type="number"
          min={0}
          step="0.01"
          label="Amount"
          placeholder="e.g. 2000"
          required
          error={errors.amount?.message}
          disabled={amountLocked}
          {...register("amount")}
        />
        {amountLocked ? (
          <p className="md:col-start-2 -mt-3 text-[12px] leading-5 text-amber-700">
            Amount is locked because this component has already been assigned to an invoice.
          </p>
        ) : null}

        <div className="md:col-span-2">
          <label htmlFor="description" className={labelClassName}>
            Description
          </label>
          <textarea
            id="description"
            className={textAreaClassName}
            placeholder="Short note about the fee component"
            {...register("description")}
          />
          {errors.description ? (
            <p className={`mt-1 text-red-600 ${bodyTextClassName}`}>
              {errors.description.message}
            </p>
          ) : null}
        </div>

        <label className="inline-flex w-fit items-center gap-3 text-slate-700 md:col-span-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 accent-emerald-600 focus:ring-emerald-500"
            {...register("is_active")}
          />
          <span className={bodyTextClassName}>Component is active.</span>
        </label>
      </div>

      {footer}
    </form>
  );
}

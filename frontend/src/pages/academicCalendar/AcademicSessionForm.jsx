import * as yup from "yup";

import { FormInput } from "@/components/FormInput";
import {
  bodyTextClassName,
  labelClassName,
  selectClassName,
  textAreaClassName,
} from "@/lib/styles";

export const academicSessionSchema = yup.object({
  code: yup
    .string()
    .required("Session code is required")
    .max(50, "Session code must be at most 50 characters"),
  name: yup
    .string()
    .required("Session name is required")
    .max(100, "Session name must be at most 100 characters"),
  description: yup
    .string()
    .nullable()
    .max(2000, "Description must be at most 2000 characters"),
  status: yup.string().oneOf(["active", "ended", "disabled"]).required(),
});

export const defaultAcademicSessionValues = {
  code: "",
  name: "",
  description: "",
  status: "disabled",
};

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

export function normalizeAcademicSessionPayload(values, academicYearId) {
  const today = getTodayString();
  let is_active = false;
  let start_date = null;
  let end_date = null;

  if (values.status === "active") {
    is_active = true;
    start_date = today;
  } else if (values.status === "ended") {
    end_date = today;
  }

  return {
    academic_year_id: academicYearId,
    code: values.code.trim(),
    name: values.name.trim(),
    start_date,
    end_date,
    description: values.description?.trim() || null,
    is_active,
  };
}

export function AcademicSessionForm({
  formId = "academic-session-form",
  onSubmit,
  register,
  watch,
  errors,
  loading = false,
  formError = "",
  yearField = null,
  footer = null,
}) {
  if (loading) {
    return (
      <div className={`py-6 text-slate-500 ${bodyTextClassName}`}>
        Loading session details...
      </div>
    );
  }

  const currentStatus = watch?.("status");

  return (
    <form id={formId} className="space-y-4" onSubmit={onSubmit}>
      {yearField}

      {formError ? (
        <div
          className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}
        >
          {formError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <FormInput
          id="code"
          label="Session Code"
          placeholder="e.g. TERM 1"
          required
          error={errors.code?.message}
          {...register("code")}
        />

        <FormInput
          id="name"
          label="Session Name"
          placeholder="e.g. Term 1"
          required
          error={errors.name?.message}
          {...register("name")}
        />

        <div>
          <label htmlFor="status" className={labelClassName}>Status</label>
          <select
            id="status"
            className={`${selectClassName} w-full`}
            {...register("status")}
          >
            <option value="disabled">Disabled</option>
            <option value="active">Activate</option>
            <option value="ended">End</option>
          </select>
          <div className={`mt-1.5 space-x-3 text-[13px] text-slate-500`}>
            {currentStatus === "active" ? (
              <span>Start date will be set to today.</span>
            ) : null}
            {currentStatus === "ended" ? (
              <span>End date will be set to today.</span>
            ) : null}
            {currentStatus === "disabled" ? (
              <span>Session will be inactive with no dates set.</span>
            ) : null}
          </div>
        </div>

        <div className="md:col-span-2">
          <label htmlFor="description" className={labelClassName}>Description</label>
          <textarea
            id="description"
            className={textAreaClassName}
            placeholder="Short note about the session"
            {...register("description")}
          />
          {errors.description ? (
            <p className={`mt-1 text-red-600 ${bodyTextClassName}`}>{errors.description.message}</p>
          ) : null}
        </div>
      </div>

      {footer}
    </form>
  );
}

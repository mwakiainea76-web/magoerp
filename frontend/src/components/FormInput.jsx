import { forwardRef } from "react";

const baseLabelClassName = "mb-1 block text-[13px] font-medium text-slate-600";

const baseInputClassName =
  "h-9 w-full rounded-lg border bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-[13px] placeholder:text-[#a8b6c7] disabled:bg-slate-50 disabled:text-slate-600";

function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

export const FormInput = forwardRef(function FormInput(
  {
    id,
    label,
    error,
    className = "",
    inputClassName = "",
    type = "text",
    required = false,
    ...props
  },
  ref,
) {
  const inputStateClassName = error
    ? "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100"
    : "border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className={baseLabelClassName}>
          {label}
          {required ? <span className="text-red-400"> *</span> : null}
        </label>
      ) : null}

      <input
        ref={ref}
        id={id}
        type={type}
        className={joinClasses(
          baseInputClassName,
          inputStateClassName,
          inputClassName,
        )}
        aria-invalid={error ? "true" : "false"}
        {...props}
      />

      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  );
});



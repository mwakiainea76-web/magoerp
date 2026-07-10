import { forwardRef, useId } from "react";

const LABEL_CLASSES = "mb-1 block text-[13px] font-medium text-slate-600";

const INPUT_BASE_CLASSES =
  "h-9 w-full rounded-lg border bg-white px-4 text-[14px] leading-5 text-slate-700 " +
  "shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition " +
  "placeholder:text-[13px] placeholder:text-[#a8b6c7] " +
  "disabled:bg-slate-50 disabled:text-slate-600 disabled:cursor-not-allowed";

const INPUT_STATE_CLASSES = {
  default:
    "border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-100",
  error:
    "border-red-300 focus:border-red-400 focus:ring-4 focus:ring-red-100",
};

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Labeled text input with optional error state and a clickable right-side icon
 * (e.g. show/hide password, clear, unit suffix). Forwards its ref to the
 * underlying <input> so it works with form libraries (react-hook-form, etc).
 */
export const FormInput = forwardRef(function FormInput(
  {
    id,
    label,
    error,
    className = "",
    inputClassName = "",
    type = "text",
    required = false,
    rightIcon,
    rightIconLabel = "Toggle field option",
    onRightIconClick,
    placeholder,
    ...props
  },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={inputId} className={LABEL_CLASSES}>
          {label}
          {required ? (
            <span className="text-red-400" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
        </label>
      ) : null}

      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={type}
          placeholder={placeholder}
          required={required}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={errorId}
          className={cx(
            INPUT_BASE_CLASSES,
            rightIcon && "pr-10",
            error ? INPUT_STATE_CLASSES.error : INPUT_STATE_CLASSES.default,
            inputClassName,
          )}
          {...props}
        />

        {rightIcon ? (
          <button
            type="button"
            onClick={onRightIconClick}
            aria-label={rightIconLabel}
            tabIndex={-1}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600 focus-visible:text-slate-600 focus-visible:outline-none"
          >
            {rightIcon}
          </button>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
});
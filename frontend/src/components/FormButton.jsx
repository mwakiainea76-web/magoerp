import { forwardRef } from "react";

function joinClasses(...classes) {
  return classes.filter(Boolean).join(" ");
}

const variantClasses = {
  primary:
    "bg-emerald-600 text-white shadow-[0_4px_10px_rgba(5,150,105,0.15)] hover:bg-emerald-700 focus:ring-4 focus:ring-emerald-100",
  secondary:
    "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-800 focus:ring-4 focus:ring-slate-100",
  danger:
    "bg-red-600 text-white shadow-[0_4px_10px_rgba(220,38,38,0.12)] hover:bg-red-700 focus:ring-4 focus:ring-red-100",
};

export const FormButton = forwardRef(function FormButton(
  {
    className = "",
    variant = "primary",
    type = "button",
    disabled = false,
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={joinClasses(
        "inline-flex h-9 items-center justify-center rounded-lg px-4 text-[13px] font-semibold leading-5 outline-none transition disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant] ?? variantClasses.primary,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

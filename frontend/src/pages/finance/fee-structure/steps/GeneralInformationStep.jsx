import { useFormContext } from "react-hook-form";
import { FormInput } from "@/components/FormInput";
import { labelClassName, textAreaClassName } from "@/lib/styles";

export function GeneralInformationStep() {
  const {
    register,
    formState: { errors },
  } = useFormContext();
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <h2 className="text-[15px] font-semibold text-slate-900">
        General Information
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <FormInput
          label="Code"
          placeholder="e.g. CSC-FEES-2026"
          required
          error={errors.code?.message}
          {...register("code", { setValueAs: (value) => value.toUpperCase() })}
        />
        <FormInput
          label="Fee Structure Name"
          placeholder="e.g. BSc Computer Science Fees"
          required
          error={errors.name?.message}
          {...register("name")}
        />

        <div className="md:col-span-2">
          <label htmlFor="fee-structure-description" className={labelClassName}>
            Description
          </label>
          <textarea
            id="fee-structure-description"
            rows={2}
            placeholder="Optional description"
            className={textAreaClassName}
            {...register("description")}
          />
        </div>
      </div>
    </div>
  );
}

import { useCallback, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import * as yup from "yup";

import { bodyTextClassName, selectClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { LookupSelect } from "@/components/LookupSelect";
import { useMarksApi } from "@/hooks/useMarksApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const ASSESSMENT_TYPES = ["CAT 1", "CAT 2", "CAT 3", "PRAC 1", "PRAC 2", "PRAC 3"];

const marksSchema = yup.object({
  unit_id: yup.string().required("Unit is required"),
  assessment_type: yup.string().required("Assessment type is required"),
  student_admission_number: yup.string().required("Admission number is required"),
  score: yup.number().typeError("Score must be a number").required("Score is required").min(0, "Minimum score is 0").max(100, "Maximum score is 100"),
});

export function AddMarksPage() {
  const marksApi = useMarksApi();
  const [selectedUnit, setSelectedUnit] = useState(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(marksSchema),
    defaultValues: {
      unit_id: "",
      assessment_type: "CAT 1",
      student_admission_number: "",
      score: "",
    },
  });

  const fetchUnits = useCallback(async (query) => {
    const res = await marksApi.availableUnits({ q: query });
    return (res.data ?? []).map((u) => ({
      id: u.id,
      label: `${u.code} - ${u.name}`,
    }));
  }, [marksApi]);

  async function onSubmit(data) {
    try {
      await marksApi.create({
        unit_id: data.unit_id,
        student_admission_number: data.student_admission_number.trim(),
        assessment_type: data.assessment_type,
        score: Number(data.score),
      });

      toast.success("Score recorded.");
      reset({ ...data, student_admission_number: "", score: "" });
    } catch (e) {
      const serverErrors = e?.response?.data?.errors;
      if (serverErrors) {
        Object.entries(serverErrors).forEach(([key, value]) => {
          setError(key, { message: value?.[0] ?? "Invalid value" });
        });
      } else {
        setError("root", { message: getApiErrorMessage(e, "Failed to submit score.") });
      }
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Add Marks</h1>
        <p className="text-[13px] text-slate-500">Record a score for a registered student unit assessment</p>
      </div>

      {errors.root ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{errors.root.message}</div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Controller
              name="unit_id"
              control={control}
              render={({ field }) => (
                <LookupSelect
                  label="Unit"
                  value={field.value}
                  onChange={(nextValue, option) => {
                    field.onChange(nextValue);
                    setSelectedUnit(option);
                  }}
                  fetchOptions={fetchUnits}
                  selectedOption={selectedUnit}
                  required
                  placeholder="Search unit"
                  error={errors.unit_id?.message}
                />
              )}
            />

            <div>
              <label htmlFor="assessment_type" className="mb-1 block text-[13px] font-medium text-slate-600">Assessment Type <span className="text-red-400"> *</span></label>
              <select id="assessment_type" className={`${selectClassName} w-full`} {...register("assessment_type")}>
                {ASSESSMENT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.assessment_type ? <p className="mt-1 text-sm text-red-600">{errors.assessment_type.message}</p> : null}
            </div>

            <FormInput
              id="student_admission_number"
              label="Admission Number"
              placeholder="e.g. ADM/001/26"
              required
              error={errors.student_admission_number?.message}
              {...register("student_admission_number")}
            />

            <FormInput
              id="score"
              label="Score"
              type="number"
              min={0}
              max={100}
              placeholder="e.g. 75"
              required
              error={errors.score?.message}
              {...register("score")}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <FormButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Score"}
          </FormButton>
        </div>
      </form>
    </section>
  );
}

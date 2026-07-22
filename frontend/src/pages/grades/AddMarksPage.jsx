import { useCallback, useEffect, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import * as yup from "yup";

import { bodyTextClassName, labelClassName, selectClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { LookupSelect } from "@/components/LookupSelect";
import { useMarksApi } from "@/hooks/useMarksApi";
import { useExamSeriesApi } from "@/hooks/useExamSeriesApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const marksSchema = yup.object({
  unit_id: yup.string().required("Unit is required"),
  exam_series_id: yup.string().required("Exam series is required"),
  assessment_type: yup.string().required("Assessment type is required"),
  student_admission_number: yup.string().required("Admission number is required"),
  score: yup.number().typeError("Score must be a number").required("Score is required").min(0, "Minimum score is 0").max(100, "Maximum score is 100"),
});

export function AddMarksPage() {
  const marksApi = useMarksApi();
  const examSeriesApi = useExamSeriesApi();
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [examSeriesOptions, setExamSeriesOptions] = useState([]);
  const [selectedExamSeriesId, setSelectedExamSeriesId] = useState("");
  const [selectedExamSeriesOption, setSelectedExamSeriesOption] = useState(null);
  const [assessmentTypes, setAssessmentTypes] = useState([]);

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
      exam_series_id: "",
      assessment_type: "",
      student_admission_number: "",
      score: "",
    },
  });

  useEffect(() => {
    examSeriesApi.options().then((res) => {
      setExamSeriesOptions(res.data ?? []);
    }).catch(() => {});
  }, [examSeriesApi]);

  useEffect(() => {
    if (!selectedExamSeriesId) {
      setAssessmentTypes([]);
      return;
    }
    marksApi.assessmentTypes({ exam_series_id: selectedExamSeriesId })
      .then((res) => setAssessmentTypes(res.data ?? []))
      .catch(() => {});
  }, [marksApi, selectedExamSeriesId]);

  const fetchExamSeries = useCallback(async (query) => {
    const q = (query ?? "").toLowerCase();
    return examSeriesOptions
      .filter((s) => !q || s.name.toLowerCase().includes(q) || (s.short_name ?? "").toLowerCase().includes(q))
      .map((s) => ({ id: s.id, label: `${s.name}${s.short_name ? ` (${s.short_name})` : ""}` }));
  }, [examSeriesOptions]);

  const fetchUnits = useCallback(async (query) => {
    const params = { q: query };
    if (selectedExamSeriesId) params.exam_series_id = selectedExamSeriesId;
    const res = await marksApi.availableUnits(params);
    return (res.data ?? []).map((u) => ({
      id: u.id,
      label: `${u.code} - ${u.name}`,
    }));
  }, [marksApi, selectedExamSeriesId]);

  async function onSubmit(data) {
    try {
      await marksApi.create({
        exam_series_id: data.exam_series_id,
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
        <p className="text-[13px] text-slate-500">Record individual student scores</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Controller
              name="exam_series_id"
              control={control}
              render={({ field }) => (
                <LookupSelect
                  label="Exam Series"
                  value={field.value}
                  onChange={(nextValue, option) => {
                    field.onChange(nextValue);
                    setSelectedExamSeriesId(nextValue);
                    setSelectedExamSeriesOption(option);
                  }}
                  fetchOptions={fetchExamSeries}
                  selectedOption={selectedExamSeriesOption}
                  required
                  placeholder="Search exam series"
                  error={errors.exam_series_id?.message}
                />
              )}
            />

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
                  disabled={!selectedExamSeriesId}
                />
              )}
            />

            <div>
              <label htmlFor="assessment_type" className={`mb-1 block text-[13px] font-medium text-slate-600 ${labelClassName}`}>Assessment Type <span className="text-red-400"> *</span></label>
              <select id="assessment_type" className={`${selectClassName} w-full`} {...register("assessment_type")}>
                <option value="">Select type</option>
                {assessmentTypes.map((type) => (
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

import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import * as yup from "yup";

import { bodyTextClassName, labelClassName, fieldClassName, textAreaClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { LookupSelect } from "@/components/LookupSelect";
import { useLookupApi } from "@/hooks/useLookupApi";
import { useUnitsApi } from "@/hooks/useUnitsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

function nullableNumberSchema(typeErrorMessage) {
  return yup
    .number()
    .nullable()
    .transform((value, originalValue) => {
      if (originalValue === "" || originalValue === null || typeof originalValue === "undefined") {
        return null;
      }

      return Number.isNaN(value) ? null : value;
    })
    .typeError(typeErrorMessage);
}

const MODULES_PER_YEAR = 3;

function resolveModule(module) {
  if (!module) return null;
  return {
    year: Math.floor((module - 1) / MODULES_PER_YEAR) + 1,
    session: ((module - 1) % MODULES_PER_YEAR) + 1,
  };
}

const unitSchema = yup.object({
  course_curriculum_id: yup.string().required("Course & version is required"),
  code: yup.string().required("Unit code is required").max(50, "Max 50 characters"),
  name: yup.string().required("Unit name is required").max(255, "Max 255 characters"),
  description: yup.string().nullable().max(2000, "Max 2000 characters"),
  modules_taught: nullableNumberSchema("Module must be a valid number").integer("Module must be a whole number").min(1, "Min 1").max(99, "Max 99"),
  taught_hours: nullableNumberSchema("Taught hours must be a valid number").integer("Taught hours must be a whole number").min(1, "Min 1 hour").max(500, "Max 500 hours"),
  credit_factor: nullableNumberSchema("Credit factor must be a valid number").positive("Credit factor must be greater than 0"),
  is_active: yup.boolean().required(),
});

function normalizePayload(values) {
  return {
    course_curriculum_id: values.course_curriculum_id,
    code: values.code.trim(),
    name: values.name.trim(),
    description: values.description?.trim() || null,
    modules_taught: values.modules_taught || null,
    taught_hours: values.taught_hours || null,
    credit_factor: values.credit_factor || null,
    is_active: Boolean(values.is_active),
  };
}

export function UnitFormPage() {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const unitsApi = useUnitsApi();
  const lookupApi = useLookupApi();
  const isEdit = Boolean(unitId);

  const [selectedCourseCurriculum, setSelectedCourseCurriculum] = useState(null);
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const title = useMemo(() => (isEdit ? "Edit Unit" : "Add Unit"), [isEdit]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(unitSchema),
    defaultValues: {
      course_curriculum_id: "",
      code: "",
      name: "",
      description: "",
      modules_taught: "",
      taught_hours: "",
      credit_factor: "",
      is_active: true,
    },
  });

  const modulesTaughtValue = useWatch({ control, name: "modules_taught" });
  const resolvedProgress = resolveModule(modulesTaughtValue);

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setIsLoading(true);
      setPageError("");

      try {
        if (!isEdit) return;

        const response = await unitsApi.show(unitId);
        if (!isMounted) return;

        const unit = response.data;

        reset({
          course_curriculum_id: unit.course_curriculum_id ?? "",
          code: unit.code ?? "",
          name: unit.name ?? "",
          description: unit.description ?? "",
          modules_taught: unit.modules_taught ?? "",
          taught_hours: unit.taught_hours ?? "",
          credit_factor: unit.credit_factor ?? "",
          is_active: unit.is_active ?? true,
        });

        setSelectedCourseCurriculum({
          id: unit.course_curriculum_id,
          label: [unit.course_name, unit.curriculum_name, unit.certification_level_name]
            .filter(Boolean)
            .join(" - "),
        });
      } catch (loadError) {
        if (isMounted) {
          setPageError(getApiErrorMessage(loadError, "Server error."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPage();

    return () => { isMounted = false; };
  }, [unitId, unitsApi, isEdit, reset]);

  async function fetchCourseCurriculumOptions(query) {
    const response = await lookupApi.search("course-curricula", { query, limit: 10 });
    return response.data ?? [];
  }

  async function onSubmit(data) {
    setIsSaving(true);
    setPageError("");

    try {
      const payload = normalizePayload(data);

      if (isEdit) {
        await unitsApi.update(unitId, payload);
        toast.success("Unit updated successfully.");
      } else {
        await unitsApi.create(payload);
        toast.success("Unit created successfully.");
      }

      navigate("/units", { replace: true });
    } catch (saveError) {
      const validationErrors = saveError?.response?.data?.errors;

      if (validationErrors) {
        Object.entries(validationErrors).forEach(([key, value]) => {
          setError(key, { message: value?.[0] ?? "Invalid value" });
        });
      } else {
        setPageError(getApiErrorMessage(saveError, "Server error."));
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">{title}</h1>
          <p className="text-[13px] text-slate-500">Create or update a unit within a course curriculum version.</p>
        </div>

        <Link
          to="/units"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to units
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        {isLoading ? (
          <div className={`text-slate-500 ${bodyTextClassName}`}>Loading form...</div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {pageError ? (
              <div className={`mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{pageError}</div>
            ) : null}

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <Controller
                  name="course_curriculum_id"
                  control={control}
                  render={({ field }) => (
                    <LookupSelect
                      label="Course & Version"
                      value={field.value}
                      required
                      selectedOption={selectedCourseCurriculum}
                      onChange={(nextValue, option) => {
                        field.onChange(nextValue);
                        setSelectedCourseCurriculum(option);
                        clearErrors("course_curriculum_id");
                      }}
                      fetchOptions={fetchCourseCurriculumOptions}
                      error={errors.course_curriculum_id?.message}
                      placeholder="Type course code, name, or curriculum code"
                      emptyMessage="No course-curriculum combinations found."
                    />
                  )}
                />
              <FormInput
                id="code"
                label="Unit Code"
                placeholder="e.g. ICT-CU-01"
                required
                error={errors.code?.message}
                {...register("code")}
              />

              <FormInput
                id="name"
                label="Unit Name"
                placeholder="e.g. Introduction to Programming"
                required
                error={errors.name?.message}
                {...register("name")}
              />

              <FormInput
                id="modules_taught"
                type="number"
                min={1}
                max={99}
                label="Offered in Module"
                placeholder="e.g. 5 — leave empty if spans entire study period"
                error={errors.modules_taught?.message}
                {...register("modules_taught")}
              />
              {resolvedProgress && (
                <p className="-mt-2 text-xs text-slate-500">
                  Year {resolvedProgress.year} — Session {resolvedProgress.session}
                </p>
              )}

              <FormInput
                id="taught_hours"
                type="number"
                min={1}
                max={500}
                label="Taught Hours"
                placeholder="e.g. 120"
                error={errors.taught_hours?.message}
                {...register("taught_hours")}
              />

              <FormInput
                id="credit_factor"
                type="number"
                min={0.01}
                step="0.01"
                label="Credit Factor"
                placeholder="e.g. 3.00"
                error={errors.credit_factor?.message}
                {...register("credit_factor")}
              />

              <label className="flex items-center gap-3 rounded-2xl px-1 py-2 text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600 focus:ring-emerald-500"
                  {...register("is_active")}
                />
                <span className={bodyTextClassName}>Unit is active and available for enrollment.</span>
              </label>

              <div className="col-span-3">
                <label htmlFor="description" className={labelClassName}>Description</label>
                <textarea
                  id="description"
                  className={textAreaClassName}
                  placeholder="Short note about the unit"
                  {...register("description")}
                />
                {errors.description ? (
                  <p className={`mt-1 text-red-600 ${bodyTextClassName}`}>{errors.description.message}</p>
                ) : null}
              </div>

            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <Link to="/units" className="sm:w-auto">
                <FormButton type="button" variant="secondary" className="w-full sm:w-auto sm:px-5">Cancel</FormButton>
              </Link>
              <FormButton type="submit" disabled={isSaving} className="sm:w-auto sm:px-5">
                {isSaving ? "Saving..." : isEdit ? "Update Unit" : "Create Unit"}
              </FormButton>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

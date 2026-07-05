import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import * as yup from "yup";

import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { LookupSelect } from "@/components/LookupSelect";
import { useCoursesApi } from "@/hooks/useCoursesApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { bodyTextClassName, labelClassName, inputTextClassName, fieldClassName, textAreaClassName } from "@/lib/styles";
import { getApiErrorMessage } from "@/lib/api/authClient";

const courseSchema = yup.object({
  code: yup.string().required("Course code is required").max(50, "Max 50 characters"),
  initials: yup.string().required("Initials are required").max(20, "Max 20 characters"),
  name: yup.string().required("Course name is required").max(255, "Max 255 characters"),
  duration_months: yup.number().required("Duration is required").min(1, "Min 1").max(600, "Max 600").typeError("Must be a number"),
  description: yup.string().nullable().max(2000, "Max 2000 characters"),
  is_active: yup.boolean().required(),
  certification_authority_id: yup.string().required("Certification authority is required"),
  certification_level_id: yup.string().required("Certification level is required"),
  department_id: yup.string().required("Department is required"),
  curriculum_id: yup.string().nullable(),
});

function normalizePayload(values) {
  return {
    code: values.code.trim(),
    initials: values.initials.trim(),
    name: values.name.trim(),
    duration_months: values.duration_months ? Number(values.duration_months) : null,
    description: values.description?.trim() || null,
    is_active: Boolean(values.is_active),
    certification_authority_id: values.certification_authority_id,
    certification_level_id: values.certification_level_id,
    department_id: values.department_id,
    curriculum_id: values.curriculum_id || undefined,
  };
}

export function CourseFormPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const coursesApi = useCoursesApi();
  const lookupApi = useLookupApi();
  const isEdit = Boolean(courseId);

  const [selectedAuthority, setSelectedAuthority] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const title = useMemo(() => (isEdit ? "Edit Course" : "Add Course"), [isEdit]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(courseSchema),
    defaultValues: {
      code: "",
      initials: "",
      name: "",
      duration_months: "",
      description: "",
      is_active: true,
      certification_authority_id: "",
      certification_level_id: "",
      department_id: "",
      curriculum_id: "",
    },
  });

  const watchedAuthorityId = watch("certification_authority_id");

  useEffect(() => {
    if (!isEdit) {
      setSelectedLevel(null);
      setSelectedCurriculum(null);
      reset({
        ...watch(),
        certification_level_id: "",
        curriculum_id: "",
      });
    }
  }, [watchedAuthorityId]);

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setIsLoading(true);
      setPageError("");

      try {
        if (!isEdit) {
          return;
        }

        const response = await coursesApi.show(courseId);

        if (!isMounted) return;

        const course = response.data;

        reset({
          code: course.code ?? "",
          initials: course.initials ?? "",
          name: course.name ?? "",
          duration_months: course.duration_months ?? "",
          description: course.description ?? "",
          is_active: course.is_active ?? true,
          certification_authority_id: course.certification_authority_id ?? "",
          certification_level_id: course.certification_level_id ?? "",
          department_id: course.department_id ?? "",
          curriculum_id: course.curricula?.[0]?.id ?? "",
        });

        setSelectedAuthority({
          id: course.certification_authority_id,
          label: `${course.certification_authority_code} ${course.certification_authority_name}`,
        });
        setSelectedLevel({
          id: course.certification_level_id,
          label: course.certification_level_name,
        });
        setSelectedDepartment({
          id: course.department_id,
          label: course.department_name,
        });

        if (course.curricula?.length > 0) {
          setSelectedCurriculum({
            id: course.curricula[0].id,
            label: `${course.curricula[0].code} ${course.curricula[0].name}`,
          });
        }
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
  }, [courseId, coursesApi, isEdit, reset]);

  async function fetchAuthorityOptions(query) {
    const response = await lookupApi.search("certification-authorities", { query, limit: 5 });
    return response.data ?? [];
  }

  async function fetchLevelOptions(query) {
    const params = { query, limit: 5 };
    if (watchedAuthorityId) {
      params.authority_id = watchedAuthorityId;
    }
    const response = await lookupApi.search("certification-levels", params);
    return response.data ?? [];
  }

  async function fetchCurriculumOptions(query) {
    const params = { query, limit: 5 };
    if (watchedAuthorityId) {
      params.authority_id = watchedAuthorityId;
    }
    const response = await lookupApi.search("curricula", params);
    return response.data ?? [];
  }

  async function fetchDepartmentOptions(query) {
    const response = await lookupApi.search("departments", { query, limit: 5 });
    return response.data ?? [];
  }

  async function onSubmit(data) {
    setIsSaving(true);
    setPageError("");

    try {
      const payload = normalizePayload(data);

      if (isEdit) {
        await coursesApi.update(courseId, payload);
        toast.success("Course updated successfully.");
      } else {
        await coursesApi.create(payload);
        toast.success("Course created successfully.");
      }

      navigate("/admin/courses", { replace: true });
    } catch (saveError) {
      const validationErrors = saveError?.response?.data?.errors;

      if (validationErrors) {
        Object.entries(validationErrors).forEach(([key, value]) => {
          setError(key, { message: value?.[0] ?? "Invalid value" });
        });
      } else {
        console.error("Course save error:", saveError?.response?.data || saveError?.message || saveError);
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
          <p className="text-[13px] text-slate-500">Register a course and link its curriculum version.</p>
        </div>

        <Link
          to="/admin/courses"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to courses
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
              <FormInput
                id="code"
                label="Course Code"
                placeholder="e.g. ICT-L6-C4"
                required
                error={errors.code?.message}
                {...register("code")}
              />

              <FormInput
                id="name"
                label="Course Name"
                placeholder="e.g. ICT Technician Level 6"
                required
                error={errors.name?.message}
                {...register("name")}
              />

              <FormInput
                id="initials"
                label="Initials"
                placeholder="e.g. ICT"
                required
                error={errors.initials?.message}
                {...register("initials")}
              />

              <FormInput
                id="duration_months"
                label="Duration (Total Months)"
                type="number"
                min={1}
                max={600}
                placeholder="e.g. 36"
                error={errors.duration_months?.message}
                {...register("duration_months")}
              />

              <Controller
                name="certification_authority_id"
                control={control}
                render={({ field }) => (
                  <LookupSelect
                    label="Certification Authority"
                    value={field.value}
                    required
                    selectedOption={selectedAuthority}
                    onChange={(nextValue, option) => {
                      field.onChange(nextValue);
                      setSelectedAuthority(option);
                      setSelectedLevel(null);
                      setSelectedCurriculum(null);
                      clearErrors("certification_authority_id");
                      clearErrors("certification_level_id");
                      clearErrors("curriculum_id");
                    }}
                    fetchOptions={fetchAuthorityOptions}
                    error={errors.certification_authority_id?.message}
                    placeholder="Type authority code or name"
                    emptyMessage="No authority found."
                  />
                )}
              />

              <Controller
                name="certification_level_id"
                control={control}
                render={({ field }) => (
                  <LookupSelect
                    label="Certification Level"
                    value={field.value}
                    required
                    selectedOption={selectedLevel}
                    onChange={(nextValue, option) => {
                      field.onChange(nextValue);
                      setSelectedLevel(option);
                      clearErrors("certification_level_id");
                    }}
                    fetchOptions={fetchLevelOptions}
                    error={errors.certification_level_id?.message}
                    placeholder={watchedAuthorityId ? "Type level name or code" : "Select an authority first"}
                    emptyMessage="No levels found for this authority."
                    disabled={!watchedAuthorityId}
                  />
                )}
              />

              <Controller
                name="curriculum_id"
                control={control}
                render={({ field }) => (
                  <LookupSelect
                    label="Curriculum Version"
                    value={field.value}
                    selectedOption={selectedCurriculum}
                    onChange={(nextValue, option) => {
                      field.onChange(nextValue);
                      setSelectedCurriculum(option);
                      clearErrors("curriculum_id");
                    }}
                    fetchOptions={fetchCurriculumOptions}
                    error={errors.curriculum_id?.message}
                    placeholder={watchedAuthorityId ? "Type curriculum code or name" : "Select an authority first"}
                    emptyMessage="No curricula found for this authority."
                    disabled={!watchedAuthorityId}
                  />
                )}
              />

              <Controller
                name="department_id"
                control={control}
                render={({ field }) => (
                  <LookupSelect
                    label="Department"
                    value={field.value}
                    required
                    selectedOption={selectedDepartment}
                    onChange={(nextValue, option) => {
                      field.onChange(nextValue);
                      setSelectedDepartment(option);
                      clearErrors("department_id");
                    }}
                    fetchOptions={fetchDepartmentOptions}
                    error={errors.department_id?.message}
                    placeholder="Type department name or code"
                    emptyMessage="No department found."
                  />
                )}
              />

              <label className="flex items-center gap-3 rounded-2xl px-1 py-2 text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600 focus:ring-emerald-500"
                  {...register("is_active")}
                />
                <span className={bodyTextClassName}>Course is active and available for enrollment.</span>
              </label>

              <div className="col-span-3">
                <label htmlFor="description" className={labelClassName}>Description</label>
                <textarea
                  id="description"
                  className={textAreaClassName}
                  placeholder="Short note about the course"
                  {...register("description")}
                />
                {errors.description ? (
                  <p className={`mt-1 text-red-600 ${bodyTextClassName}`}>{errors.description.message}</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <Link to="/admin/courses" className="sm:w-auto">
                <FormButton type="button" variant="secondary" className="w-full sm:w-auto sm:px-5">Cancel</FormButton>
              </Link>
              <FormButton type="submit" disabled={isSaving} className="sm:w-auto sm:px-5">
                {isSaving ? "Saving..." : isEdit ? "Update Course" : "Create Course"}
              </FormButton>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

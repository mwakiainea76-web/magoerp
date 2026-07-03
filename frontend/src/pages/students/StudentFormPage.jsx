import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import * as yup from "yup";

import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { LookupSelect } from "@/components/LookupSelect";
import { useStudentsApi } from "@/hooks/useStudentsApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { bodyTextClassName, textAreaClassName } from "@/lib/styles";
import { getApiErrorMessage } from "@/lib/api/authClient";

const relationshipOptions = ["Partner", "Sibling", "Father", "Mother", "Relative", "Guardian"];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const studentSchema = yup.object({
  email: yup.string().email("Invalid email").required("Email is required").max(255),

  first_name: yup.string().required("First name is required").max(255),
  middle_name: yup.string().required("Middle name is required").max(255),
  last_name: yup.string().required("Last name is required").max(255),
  gender: yup.string().required("Gender is required").oneOf(["male", "female", "other"]),
  date_of_birth: yup.date().required("Date of birth is required"),
  nationality: yup.string().required("Nationality is required").max(255),
  national_id: yup.string().required("National ID is required").max(255),
  place_of_birth: yup.string().required("Place of birth is required").max(255),
  religion: yup.string().required("Religion is required").max(255),
  phone_number: yup.string().required("Phone number is required").max(50),
  alternative_phone_number: yup.string().required("Alternative phone is required").max(50),

  county: yup.string().required("County is required").max(255),

  exam_body_id: yup
    .string()
    .required("Exam body is required")
    .matches(uuidPattern, "Select a valid exam body"),

  level_id: yup
    .string()
    .required("Level is required")
    .matches(uuidPattern, "Select a valid level"),

  course_id: yup
    .string()
    .required("Course is required")
    .matches(uuidPattern, "Select a valid course"),

  curriculum_id: yup
    .string()
    .required("Curriculum is required")
    .matches(uuidPattern, "Select a valid curriculum"),

  is_pwd: yup.boolean().required(),
  disability_type: yup.string().when("is_pwd", {
    is: true,
    then: (schema) => schema.required("Disability type is required").max(255),
    otherwise: (schema) => schema.max(255),
  }),
  disability_description: yup.string().when("is_pwd", {
    is: true,
    then: (schema) => schema.required("Disability description is required"),
    otherwise: (schema) => schema,
  }),

  next_of_kin_first_name: yup.string().required("Next of kin first name is required").max(255),
  next_of_kin_last_name: yup.string().required("Next of kin last name is required").max(255),
  next_of_kin_phone: yup.string().required("Next of kin phone is required").max(50),
  next_of_kin_alt_phone: yup.string().required("Next of kin alt phone is required").max(50),
  next_of_kin_email: yup.string().email("Invalid email").required("Next of kin email is required").max(255),
  next_of_kin_relationship: yup.string().required("Relationship is required").oneOf(relationshipOptions),

  status: yup.string().required().oneOf(["active", "inactive", "cleared", "graduated"]),
});

function normalizePayload(values) {
  return {
    email: values.email.trim(),
    first_name: values.first_name.trim(),
    middle_name: values.middle_name.trim(),
    last_name: values.last_name.trim(),
    gender: values.gender,
    date_of_birth: values.date_of_birth,
    nationality: values.nationality.trim(),
    national_id: values.national_id.trim(),
    place_of_birth: values.place_of_birth.trim(),
    religion: values.religion.trim(),
    phone_number: values.phone_number.trim(),
    alternative_phone_number: values.alternative_phone_number.trim(),
    county: values.county.trim(),
    course_id: values.course_id || null,
    curriculum_id: values.curriculum_id || null,

    is_pwd: values.is_pwd,
    disability_type: values.is_pwd ? values.disability_type.trim() : null,
    disability_description: values.is_pwd ? values.disability_description.trim() : null,

    next_of_kin_first_name: values.next_of_kin_first_name.trim(),
    next_of_kin_last_name: values.next_of_kin_last_name.trim(),
    next_of_kin_phone: values.next_of_kin_phone.trim(),
    next_of_kin_alt_phone: values.next_of_kin_alt_phone.trim(),
    next_of_kin_email: values.next_of_kin_email.trim(),
    next_of_kin_relationship: values.next_of_kin_relationship,
    status: values.status,
  };
}

export function StudentFormPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const studentsApi = useStudentsApi();
  const lookupApi = useLookupApi();
  const isEdit = Boolean(studentId);

  const [selectedExamBodyOption, setSelectedExamBodyOption] = useState(null);
  const [selectedLevelOption, setSelectedLevelOption] = useState(null);
  const [selectedCourseOption, setSelectedCourseOption] = useState(null);
  const [selectedCurriculumOption, setSelectedCurriculumOption] = useState(null);
  const [admissionNumber, setAdmissionNumber] = useState("");
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const title = useMemo(
    () => (isEdit ? "Edit Student" : "Add Student"),
    [isEdit],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(studentSchema),
    defaultValues: {
      email: "",
      first_name: "",
      middle_name: "",
      last_name: "",
      gender: "",
      date_of_birth: "",
      nationality: "",
      national_id: "",
      place_of_birth: "",
      religion: "",
      phone_number: "",
      alternative_phone_number: "",
      county: "",
      exam_body_id: "",
      level_id: "",
      course_id: "",
      curriculum_id: "",
      is_pwd: false,
      disability_type: "",
      disability_description: "",
      next_of_kin_first_name: "",
      next_of_kin_last_name: "",
      next_of_kin_phone: "",
      next_of_kin_alt_phone: "",
      next_of_kin_email: "",
      next_of_kin_relationship: "",
      status: "active",
    },
  });

  const watchedIsPwd = watch("is_pwd");
  const watchedExamBodyId = watch("exam_body_id");
  const watchedLevelId = watch("level_id");
  const watchedCourseId = watch("course_id");

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setIsLoading(true);
      setPageError("");

      try {
        if (isEdit) {
          const response = await studentsApi.show(studentId);

          if (!isMounted) return;

          if (response?.data) {
            const s = response.data;
            setAdmissionNumber(s.admission_number ?? "");
            reset({
              email: s.email ?? "",
              first_name: s.first_name ?? "",
              middle_name: s.middle_name ?? "",
              last_name: s.last_name ?? "",
              gender: s.gender ?? "",
              date_of_birth: s.date_of_birth ?? "",
              nationality: s.nationality ?? "",
              national_id: s.national_id ?? "",
              place_of_birth: s.place_of_birth ?? "",
              religion: s.religion ?? "",
              phone_number: s.phone_number ?? "",
              alternative_phone_number: s.alternative_phone_number ?? "",
              county: s.county ?? "",
              exam_body_id: s.exam_body_id ?? "",
              level_id: s.level_id ?? "",
              course_id: s.course_id ?? "",
              curriculum_id: s.curriculum_id ?? "",
              is_pwd: s.is_pwd ?? false,
              disability_type: s.disability_type ?? "",
              disability_description: s.disability_description ?? "",
              next_of_kin_first_name: s.next_of_kin_first_name ?? "",
              next_of_kin_last_name: s.next_of_kin_last_name ?? "",
              next_of_kin_phone: s.next_of_kin_phone ?? "",
              next_of_kin_alt_phone: s.next_of_kin_alt_phone ?? "",
              next_of_kin_email: s.next_of_kin_email ?? "",
              next_of_kin_relationship: s.next_of_kin_relationship ?? "",
              status: s.status ?? "active",
            });

            if (s.exam_body_id) {
              setSelectedExamBodyOption({
                id: s.exam_body_id,
                label: s.exam_body_name ?? "",
              });
            }
            if (s.level_id) {
              setSelectedLevelOption({
                id: s.level_id,
                label: s.level_name ?? "",
              });
            }
            if (s.course_id) {
              setSelectedCourseOption({
                id: s.course_id,
                label: `${s.course_code} ${s.course_name}`,
              });
            }
            if (s.curriculum_id) {
              setSelectedCurriculumOption({
                id: s.curriculum_id,
                label: s.curriculum_name ?? "",
              });
            }
          }
        } else if (isMounted) {
          setAdmissionNumber("Select a course");
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

    return () => {
      isMounted = false;
    };
  }, [studentId, studentsApi, isEdit, reset]);

  useEffect(() => {
    if (isEdit || !watchedCourseId || !watchedExamBodyId) {
      if (!isEdit) {
        setAdmissionNumber("Select a course");
      }
      return undefined;
    }

    let isMounted = true;
    setAdmissionNumber("Generating...");

    studentsApi
      .meta({
        course_id: watchedCourseId,
      })
      .then((response) => {
        if (isMounted) {
          setAdmissionNumber(response?.next_admission_number ?? "Unavailable");
        }
      })
      .catch(() => {
        if (isMounted) {
          setAdmissionNumber("Unavailable");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isEdit, studentsApi, watchedCourseId, watchedExamBodyId]);

  const fetchExamBodies = useCallback(async (query) => {
    const response = await lookupApi.search("certification-authorities", { query, limit: 10 });
    return response.data ?? [];
  }, [lookupApi]);

  const watchedExamBodyIdForLevels = watchedExamBodyId;

  const fetchLevels = useCallback(async (query) => {
    if (!watchedExamBodyIdForLevels) return [];
    const response = await lookupApi.search("certification-levels", { query, limit: 10, authority_id: watchedExamBodyIdForLevels });
    return response.data ?? [];
  }, [lookupApi, watchedExamBodyIdForLevels]);

  const watchedExamBodyIdForCourses = watchedExamBodyId;
  const watchedLevelIdForCourses = watchedLevelId;

  const fetchCourses = useCallback(async (query) => {
    if (!watchedExamBodyIdForCourses || !watchedLevelIdForCourses) return [];
    const response = await lookupApi.search("courses", { query, limit: 10, authority_id: watchedExamBodyIdForCourses, level_id: watchedLevelIdForCourses });
    return response.data ?? [];
  }, [lookupApi, watchedExamBodyIdForCourses, watchedLevelIdForCourses]);

  const watchedExamBodyIdForCurricula = watchedExamBodyId;

  const fetchCurricula = useCallback(async (query) => {
    if (!watchedExamBodyIdForCurricula) return [];
    const response = await lookupApi.search("curricula", { query, limit: 10, authority_id: watchedExamBodyIdForCurricula });
    return response.data ?? [];
  }, [lookupApi, watchedExamBodyIdForCurricula]);

  async function onSubmit(data) {
    setIsSaving(true);
    setPageError("");

    try {
      const payload = normalizePayload(data);

      if (isEdit) {
        await studentsApi.update(studentId, payload);
        toast.success("Student updated successfully.");
      } else {
        await studentsApi.create(payload);
        toast.success("Student admitted successfully.");
      }

      navigate("/students", { replace: true });
    } catch (saveError) {
      const validationErrors = saveError?.response?.data?.errors;

      if (validationErrors) {
        Object.entries(validationErrors).forEach(([key, value]) => {
          setError(key, {
            message: value?.[0] ?? "Invalid value",
          });
        });
      } else {
        setPageError(getApiErrorMessage(saveError, "Server error."));
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="space-y-5">
        <div className={`text-slate-500 ${bodyTextClassName}`}>Loading form...</div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">{title}</h1>
          <p className="text-[13px] text-slate-500">
            {isEdit ? "Update student information." : "Admit a new student."}
          </p>
        </div>

        <Link
          to="/students"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to students
        </Link>
      </div>

      {pageError ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>
          {pageError}
        </div>
      ) : null}

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {/* Section 1: Admission Information */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <h2 className="mb-4 text-[1.0625rem] font-semibold text-slate-900">Section 1: Admission Information</h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <FormInput
              id="admission_number"
              label="Admission Number"
              value={admissionNumber}
              disabled={isEdit}
            />

            <div>
              <Controller
                name="exam_body_id"
                control={control}
                render={({ field }) => (
                  <LookupSelect
                    label="Exam Body"
                    required
                    value={field.value}
                    selectedOption={selectedExamBodyOption}
                    disabled={isEdit}
                    onChange={(nextValue, option) => {
                      field.onChange(nextValue);
                      setSelectedExamBodyOption(option);
                      clearErrors("exam_body_id");
                      if (option?.id !== selectedExamBodyOption?.id) {
                        setSelectedLevelOption(null);
                        setSelectedCourseOption(null);
                        setSelectedCurriculumOption(null);
                        setValue("level_id", "");
                        setValue("course_id", "");
                        setValue("curriculum_id", "");
                      }
                    }}
                    fetchOptions={fetchExamBodies}
                    error={errors.exam_body_id?.message}
                    placeholder="Search exam body"
                    emptyMessage="No exam bodies found"
                  />
                )}
              />
            </div>

            <div>
              <Controller
                name="curriculum_id"
                control={control}
                render={({ field }) => (
                  <LookupSelect
                    label="Curriculum"
                    required
                    value={field.value}
                    selectedOption={selectedCurriculumOption}
                    disabled={isEdit || !watchedExamBodyId}
                    onChange={(nextValue, option) => {
                      field.onChange(nextValue);
                      setSelectedCurriculumOption(option);
                      clearErrors("curriculum_id");
                    }}
                    fetchOptions={fetchCurricula}
                    error={errors.curriculum_id?.message}
                    placeholder={watchedExamBodyId ? "Search curriculum" : "Select exam body first"}
                    emptyMessage="No curricula found"
                  />
                )}
              />
            </div>
            <div>
              <Controller
                name="level_id"
                control={control}
                render={({ field }) => (
                  <LookupSelect
                    label="Level"
                    required
                    value={field.value}
                    selectedOption={selectedLevelOption}
                    disabled={isEdit || !watchedExamBodyId}
                    onChange={(nextValue, option) => {
                      field.onChange(nextValue);
                      setSelectedLevelOption(option);
                      clearErrors("level_id");
                      if (option?.id !== selectedLevelOption?.id) {
                        setSelectedCourseOption(null);
                        setValue("course_id", "");
                      }
                    }}
                    fetchOptions={fetchLevels}
                    error={errors.level_id?.message}
                    placeholder={watchedExamBodyId ? "Search level" : "Select exam body first"}
                    emptyMessage="No levels found"
                  />
                )}
              />
            </div>

            <div>
              <Controller
                name="course_id"
                control={control}
                render={({ field }) => (
                  <LookupSelect
                    label="Course"
                    required
                    value={field.value}
                    selectedOption={selectedCourseOption}
                    disabled={isEdit || !watchedLevelId}
                    onChange={(nextValue, option) => {
                      field.onChange(nextValue);
                      setSelectedCourseOption(option);
                      clearErrors("course_id");
                    }}
                    fetchOptions={fetchCourses}
                    error={errors.course_id?.message}
                    placeholder={watchedLevelId ? "Search course" : "Select level first"}
                    emptyMessage="No courses found"
                  />
                )}
              />
            </div>

          </div>
        </div>

        {/* Section 2: Personal Information */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <h2 className="mb-4 text-[1.0625rem] font-semibold text-slate-900">Section 2: Personal Information</h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <FormInput id="email" label="Email" type="email" placeholder="e.g. student@mago.edu" required error={errors.email?.message} {...register("email")} />
            <FormInput id="first_name" label="First Name" placeholder="e.g. John" required error={errors.first_name?.message} {...register("first_name")} />
            <FormInput id="middle_name" label="Middle Name" placeholder="e.g. Michael" required error={errors.middle_name?.message} {...register("middle_name")} />
            <FormInput id="last_name" label="Last Name" placeholder="e.g. Doe" required error={errors.last_name?.message} {...register("last_name")} />

            <div>
              <label htmlFor="gender" className="mb-1 block text-[13px] font-medium text-slate-600">
                Gender <span className="text-red-400">*</span>
              </label>
              <select id="gender" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" {...register("gender")}>
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender ? <p className={`mt-1 text-red-600 ${bodyTextClassName}`}>{errors.gender.message}</p> : null}
            </div>

            <FormInput id="date_of_birth" type="date" label="Date of Birth" required error={errors.date_of_birth?.message} {...register("date_of_birth")} />
            <FormInput id="nationality" label="Nationality" placeholder="e.g. Kenyan" required error={errors.nationality?.message} {...register("nationality")} />
            <FormInput id="national_id" label="National ID" placeholder="e.g. 12345678" required error={errors.national_id?.message} {...register("national_id")} />
            <FormInput id="place_of_birth" label="Place of Birth" placeholder="e.g. Nairobi" required error={errors.place_of_birth?.message} {...register("place_of_birth")} />
            <FormInput id="religion" label="Religion" placeholder="e.g. Christianity" required error={errors.religion?.message} {...register("religion")} />
            <FormInput id="phone_number" label="Phone Number" placeholder="e.g. +254712345678" required error={errors.phone_number?.message} {...register("phone_number")} />
            <FormInput id="alternative_phone_number" label="Alternative Phone" placeholder="e.g. +254798765432" required error={errors.alternative_phone_number?.message} {...register("alternative_phone_number")} />
            <FormInput id="county" label="County" placeholder="e.g. Nairobi" required error={errors.county?.message} {...register("county")} />
          </div>
        </div>

        {/* Section 3: Disability Information */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <h2 className="mb-4 text-[1.0625rem] font-semibold text-slate-900">Section 3: Disability Information</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">
                <input
                  type="checkbox"
                  className="mr-2 h-4 w-4 rounded border-slate-300 text-emerald-600"
                  {...register("is_pwd")}
                />
                Person with Disability
              </label>
            </div>

            {watchedIsPwd && (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                <FormInput id="disability_type" label="Disability Type" placeholder="e.g. Visual impairment" required error={errors.disability_type?.message} {...register("disability_type")} />
                <div className="col-span-2">
                  <label htmlFor="disability_description" className="mb-1 block text-[13px] font-medium text-slate-600">
                    Disability Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    id="disability_description"
                    className={textAreaClassName}
                    placeholder="Brief description of the disability"
                    rows={2}
                    {...register("disability_description")}
                  />
                  {errors.disability_description ? (
                    <p className={`mt-1 text-red-600 ${bodyTextClassName}`}>{errors.disability_description.message}</p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Next of Kin */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <h2 className="mb-4 text-[1.0625rem] font-semibold text-slate-900">Section 4: Next of Kin</h2>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <FormInput id="next_of_kin_first_name" label="First Name" placeholder="e.g. Jane" required error={errors.next_of_kin_first_name?.message} {...register("next_of_kin_first_name")} />
            <FormInput id="next_of_kin_last_name" label="Last Name" placeholder="e.g. Doe" required error={errors.next_of_kin_last_name?.message} {...register("next_of_kin_last_name")} />
            <div>
              <label htmlFor="next_of_kin_relationship" className="mb-1 block text-[13px] font-medium text-slate-600">
                Relationship <span className="text-red-400">*</span>
              </label>
              <select id="next_of_kin_relationship" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" {...register("next_of_kin_relationship")}>
                <option value="">Select relationship</option>
                {relationshipOptions.map((relationship) => (
                  <option key={relationship} value={relationship}>{relationship}</option>
                ))}
              </select>
              {errors.next_of_kin_relationship ? <p className={`mt-1 text-red-600 ${bodyTextClassName}`}>{errors.next_of_kin_relationship.message}</p> : null}
            </div>
            <FormInput id="next_of_kin_phone" label="Phone Number" placeholder="e.g. +254723456789" required error={errors.next_of_kin_phone?.message} {...register("next_of_kin_phone")} />
            <FormInput id="next_of_kin_alt_phone" label="Alternative Phone" placeholder="e.g. +254733456789" required error={errors.next_of_kin_alt_phone?.message} {...register("next_of_kin_alt_phone")} />
            <FormInput id="next_of_kin_email" label="Email" placeholder="e.g. jane.doe@email.com" required error={errors.next_of_kin_email?.message} {...register("next_of_kin_email")} />
          </div>
        </div>

        {/* Status */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <label htmlFor="status" className="mb-1 block text-[13px] font-medium text-slate-600">
            Status <span className="text-red-400">*</span>
          </label>
          <select
            id="status"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            {...register("status")}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="cleared">Cleared</option>
            <option value="graduated">Graduated</option>
          </select>
          {errors.status ? <p className={`mt-1 text-red-600 ${bodyTextClassName}`}>{errors.status.message}</p> : null}
        </div>

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
          <Link to="/students" className="sm:w-auto">
            <FormButton type="button" variant="secondary" className="w-full sm:w-auto sm:px-5">
              Cancel
            </FormButton>
          </Link>
          <FormButton type="submit" disabled={isSaving} className="sm:w-auto sm:px-5">
            {isSaving ? "Saving..." : isEdit ? "Update Student" : "Admit Student"}
          </FormButton>
        </div>
      </form>
    </section>
  );
}

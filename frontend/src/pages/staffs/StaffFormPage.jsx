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
import { useStaffsApi } from "@/hooks/useStaffsApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { bodyTextClassName, textAreaClassName } from "@/lib/styles";
import { getApiErrorMessage } from "@/lib/api/authClient";

const relationshipOptions = ["Partner", "Sibling", "Father", "Mother", "Relative", "Guardian"];
const qualificationOptions = ["PHD", "Masters", "Degree", "Diploma", "Certificate", "Other"];

const staffSchema = yup.object({
  email: yup.string().email("Invalid email").required("Email is required").max(255),
  role: yup.string().required("Role is required"),

  first_name: yup.string().required("First name is required").max(255),
  middle_name: yup.string().required("Middle name is required").max(255),
  last_name: yup.string().required("Last name is required").max(255),
  gender: yup.string().oneOf(["male", "female", "other"], "Invalid gender").required("Gender is required"),
  date_of_birth: yup.date().required("Date of birth is required"),
  nationality: yup.string().required("Nationality is required").max(255),
  national_id: yup.string().required("National ID is required").max(255),
  place_of_birth: yup.string().required("Place of birth is required").max(255),
  religion: yup.string().required("Religion is required").max(255),
  phone_number: yup.string().required("Phone number is required").max(50),
  alternative_phone_number: yup.string().required("Alternative phone is required").max(50),

  county: yup.string().required("County is required").max(255),

  department_id: yup.string().required("Department is required").uuid(),
  job_title: yup.string().required("Job title is required").max(255),
  employment_type: yup.string().oneOf(["Permanent", "Contract", "Part-time", "Casual"], "Invalid type").required("Employment type is required"),
  date_joined: yup.date().required("Date joined is required"),
  contract_end_date: yup.date().nullable(),
  basic_salary: yup.number().typeError("Must be a number").required("Basic salary is required").min(0),

  kra_pin: yup.string().required("KRA PIN is required").max(255),
  nhif_number: yup.string().required("NHIF number is required").max(255),
  nssf_number: yup.string().required("NSSF number is required").max(255),

  highest_qualification: yup.string().oneOf(qualificationOptions, "Invalid qualification").required("Highest qualification is required"),
  specialization: yup.string().required("Specialization is required").max(255),

  is_pwd: yup.boolean().required(),
  disability_type: yup.string().required("Disability type is required").max(255),
  disability_description: yup.string().required("Disability description is required"),

  next_of_kin_first_name: yup.string().required("Next of kin first name is required").max(255),
  next_of_kin_last_name: yup.string().required("Next of kin last name is required").max(255),
  next_of_kin_phone: yup.string().required("Next of kin phone is required").max(50),
  next_of_kin_alt_phone: yup.string().required("Next of kin alt phone is required").max(50),
  next_of_kin_email: yup.string().email("Invalid email").required("Next of kin email is required").max(255),
  next_of_kin_relationship: yup.string().oneOf(relationshipOptions, "Invalid relationship").required("Relationship is required"),

  status: yup.boolean().required(),
});

function normalizePayload(values) {
  return {
    email: values.email.trim(),
    role: values.role,
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
    department_id: values.department_id || null,
    job_title: values.job_title.trim(),
    employment_type: values.employment_type,
    date_joined: values.date_joined,
    contract_end_date: values.contract_end_date,
    basic_salary: values.basic_salary,
    kra_pin: values.kra_pin.trim(),
    nhif_number: values.nhif_number.trim(),
    nssf_number: values.nssf_number.trim(),
    highest_qualification: values.highest_qualification,
    specialization: values.specialization.trim(),

    is_pwd: values.is_pwd,
    disability_type: values.disability_type.trim(),
    disability_description: values.disability_description.trim(),
    next_of_kin_first_name: values.next_of_kin_first_name.trim(),
    next_of_kin_last_name: values.next_of_kin_last_name.trim(),
    next_of_kin_phone: values.next_of_kin_phone.trim(),
    next_of_kin_alt_phone: values.next_of_kin_alt_phone.trim(),
    next_of_kin_email: values.next_of_kin_email.trim(),
    next_of_kin_relationship: values.next_of_kin_relationship,
    status: values.status,
  };
}

export function StaffFormPage() {
  const { staffId } = useParams();
  const navigate = useNavigate();
  const staffsApi = useStaffsApi();
  const lookupApi = useLookupApi();
  const isEdit = Boolean(staffId);

  const [selectedDepartmentOption, setSelectedDepartmentOption] = useState(null);
  const [selectedRoleOption, setSelectedRoleOption] = useState(null);
  const [nextEmployeeNumber, setNextEmployeeNumber] = useState("");
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPwd, setIsPwd] = useState(false);

  const title = useMemo(
    () => (isEdit ? "Edit Staff" : "Add Staff"),
    [isEdit],
  );

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
    resolver: yupResolver(staffSchema),
    defaultValues: {
      email: "",
      role: "",
      first_name: "",
      middle_name: "",
      last_name: "",
      gender: "male",
      date_of_birth: "",
      nationality: "",
      national_id: "",
      place_of_birth: "",
      religion: "",
      phone_number: "",
      alternative_phone_number: "",
      county: "",
      department_id: "",
      job_title: "",
      employment_type: "Permanent",
      date_joined: new Date().toISOString().split("T")[0],
      contract_end_date: "",
      basic_salary: "",
      kra_pin: "",
      nhif_number: "",
      nssf_number: "",
      highest_qualification: "",
      specialization: "",

      is_pwd: false,
      disability_type: "",
      disability_description: "",
      next_of_kin_first_name: "",
      next_of_kin_last_name: "",
      next_of_kin_phone: "",
      next_of_kin_alt_phone: "",
      next_of_kin_email: "",
      next_of_kin_relationship: "",
      status: true,
    },
  });

  const watchedIsPwd = watch("is_pwd");

  useEffect(() => {
    setIsPwd(watchedIsPwd);
  }, [watchedIsPwd]);

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setIsLoading(true);
      setPageError("");

      try {
        if (isEdit) {
          const staffResponse = await staffsApi.show(staffId);

          if (!isMounted) return;

            if (staffResponse?.data) {
                const s = staffResponse.data;
                reset({
                  email: s.email ?? "",
                  role: s.role ?? "trainer",
              first_name: s.first_name ?? "",
              middle_name: s.middle_name ?? "",
              last_name: s.last_name ?? "",
              gender: s.gender ?? "male",
              date_of_birth: s.date_of_birth ?? "",
              nationality: s.nationality ?? "",
              national_id: s.national_id ?? "",
              place_of_birth: s.place_of_birth ?? "",
              religion: s.religion ?? "",
              phone_number: s.phone_number ?? "",
              alternative_phone_number: s.alternative_phone_number ?? "",
              county: s.county ?? "",
              department_id: s.department_id ?? "",
              job_title: s.job_title ?? "",
              employment_type: s.employment_type ?? "Permanent",
              date_joined: s.date_joined ?? new Date().toISOString().split("T")[0],
              contract_end_date: s.contract_end_date ?? "",
              basic_salary: s.basic_salary ?? "",
              kra_pin: s.kra_pin ?? "",
              nhif_number: s.nhif_number ?? "",
              nssf_number: s.nssf_number ?? "",
              highest_qualification: s.highest_qualification ?? "",
              specialization: s.specialization ?? "",

              is_pwd: s.is_pwd ?? false,
              disability_type: s.disability_type ?? "",
              disability_description: s.disability_description ?? "",
              next_of_kin_first_name: s.next_of_kin_first_name ?? "",
              next_of_kin_last_name: s.next_of_kin_last_name ?? "",
              next_of_kin_phone: s.next_of_kin_phone ?? "",
              next_of_kin_alt_phone: s.next_of_kin_alt_phone ?? "",
              next_of_kin_email: s.next_of_kin_email ?? "",
              next_of_kin_relationship: s.next_of_kin_relationship ?? "",
              status: s.status ?? true,
            });

            setNextEmployeeNumber(s.employee_number);

            if (s.department_id) {
              setSelectedDepartmentOption({
                id: s.department_id,
                label: s.department_name
                  ? `${s.department_name}${s.department_code ? ` (${s.department_code})` : ""}`
                  : s.department_id,
              });
            }

            if (s.role) {
              setSelectedRoleOption({
                id: s.role,
                label: s.role.charAt(0).toUpperCase() + s.role.slice(1),
              });
            }

            setIsPwd(s.is_pwd ?? false);
          }
        } else {
          const metaResponse = await staffsApi.meta();
          if (isMounted) {
            setNextEmployeeNumber(metaResponse?.next_employee_number ?? "EMP/---");
          }
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
  }, [staffId, staffsApi, isEdit, reset]);

  async function onSubmit(data) {
    setIsSaving(true);
    setPageError("");

    try {
      const payload = normalizePayload(data);

      if (isEdit) {
        await staffsApi.update(staffId, payload);
        toast.success("Staff updated successfully.");
      } else {
        await staffsApi.create(payload);
        toast.success("Staff created successfully.");
      }

      navigate("/staffs", { replace: true });
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

  async function fetchDepartmentOptions(query) {
    const response = await lookupApi.search("departments", {
      query,
      limit: 5,
    });
    return response.data ?? [];
  }

  async function fetchRoleOptions(query) {
    const response = await lookupApi.search("roles", {
      query,
      limit: 10,
    });
    return response.data ?? [];
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
            {isEdit ? "Update staff information." : "Onboard a new staff member."}
          </p>
        </div>

        <Link
          to="/staffs"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to staff
        </Link>
      </div>

      {pageError ? (
        <div
          className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}
        >
          {pageError}
        </div>
      ) : null}

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        {/* Section 1: Account Details */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <h2 className="mb-4 text-[1.0625rem] font-semibold text-slate-900">Section 1: Account Details</h2>
          <div className="grid gap-4 grid-cols-3">
            <FormInput
              id="employee_number_display"
              label="Employee Number"
              value={nextEmployeeNumber}
              disabled
            />

            <FormInput
              id="email"
              label="Email"
              placeholder="e.g. john.doe@mago.edu"
              required
              error={errors.email?.message}
              {...register("email")}
            />

            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <LookupSelect
                  label="Role"
                  value={field.value}
                  selectedOption={selectedRoleOption}
                  onChange={(nextValue, option) => {
                    field.onChange(nextValue);
                    setSelectedRoleOption(option);
                    clearErrors("role");
                  }}
                  fetchOptions={fetchRoleOptions}
                  error={errors.role?.message}
                  placeholder="Select role"
                  emptyMessage="No roles found."
                  required
                />
              )}
            />
          </div>
        </div>

        {/* Section 2: Personal Information */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <h2 className="mb-4 text-[1.0625rem] font-semibold text-slate-900">Section 2: Personal Information</h2>
          <div className="grid gap-4 grid-cols-3">
            <FormInput id="first_name" label="First Name" placeholder="e.g. John" required error={errors.first_name?.message} {...register("first_name")} />
            <FormInput id="middle_name" label="Middle Name" placeholder="e.g. Michael" required error={errors.middle_name?.message} {...register("middle_name")} />
            <FormInput id="last_name" label="Last Name" placeholder="e.g. Doe" required error={errors.last_name?.message} {...register("last_name")} />

            <div>
              <label htmlFor="gender" className="mb-1 block text-[13px] font-medium text-slate-600">
                Gender <span className="text-red-400">*</span>
              </label>
              <select id="gender" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" {...register("gender")}>
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

        {/* Section 3: Employment Details */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <h2 className="mb-4 text-[1.0625rem] font-semibold text-slate-900">Section 4: Employment Details</h2>
          <div className="grid gap-4 grid-cols-3">
                        <Controller
              name="department_id"
              control={control}
              render={({ field }) => (
                <LookupSelect
                  label="Department"
                  value={field.value}
                  selectedOption={selectedDepartmentOption}
                  onChange={(nextValue, option) => {
                    field.onChange(nextValue);
                    setSelectedDepartmentOption(option);
                    clearErrors("department_id");
                  }}
                  fetchOptions={fetchDepartmentOptions}
                  error={errors.department_id?.message}
                  placeholder="Type department name or code"
                  emptyMessage="No departments found."
                />
              )}
            />

            <FormInput id="job_title" label="Job Title" placeholder="e.g. Senior Lecturer" required error={errors.job_title?.message} {...register("job_title")} />

            <div>
              <label htmlFor="employment_type" className="mb-1 block text-[13px] font-medium text-slate-600">
                Employment Type <span className="text-red-400">*</span>
              </label>
              <select id="employment_type" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" {...register("employment_type")}>
                <option value="Permanent">Permanent</option>
                <option value="Contract">Contract</option>
                <option value="Part-time">Part-time</option>
                <option value="Casual">Casual</option>
              </select>
              {errors.employment_type ? <p className={`mt-1 text-red-600 ${bodyTextClassName}`}>{errors.employment_type.message}</p> : null}
            </div>

            <FormInput id="date_joined" type="date" label="Date Joined" required error={errors.date_joined?.message} {...register("date_joined")} />
            <FormInput id="contract_end_date" type="date" label="Contract End Date" error={errors.contract_end_date?.message} {...register("contract_end_date")} />

            <FormInput id="basic_salary" type="number" step="0.01" label="Basic Salary (KES)" placeholder="e.g. 250000" required error={errors.basic_salary?.message} {...register("basic_salary")} />

            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">
                <input type="checkbox" className="mr-2 h-4 w-4 rounded border-slate-300 text-emerald-600" {...register("status")} />
                Active
              </label>
              {errors.status ? <p className={`mt-1 text-red-600 ${bodyTextClassName}`}>{errors.status.message}</p> : null}
            </div>
          </div>
        </div>

        {/* Section 5: Identification & Benefits */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <h2 className="mb-4 text-[1.0625rem] font-semibold text-slate-900">Section 5: Identification & Benefits</h2>
          <div className="grid gap-4 grid-cols-3">
            <FormInput id="kra_pin" label="KRA PIN" placeholder="e.g. KRA001001" required error={errors.kra_pin?.message} {...register("kra_pin")} />
            <FormInput id="nhif_number" label="NHIF Number" placeholder="e.g. NHIF001001" required error={errors.nhif_number?.message} {...register("nhif_number")} />
            <FormInput id="nssf_number" label="NSSF Number" placeholder="e.g. NSSF001001" required error={errors.nssf_number?.message} {...register("nssf_number")} />
          </div>
        </div>

        {/* Section 6: Academic & Professional */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <h2 className="mb-4 text-[1.0625rem] font-semibold text-slate-900">Section 6: Academic & Professional</h2>
          <div className="grid gap-4 grid-cols-3">
            <div>
              <label htmlFor="highest_qualification" className="mb-1 block text-[13px] font-medium text-slate-600">
                Highest Qualification <span className="text-red-400">*</span>
              </label>
              <select id="highest_qualification" className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" {...register("highest_qualification")}>
                <option value="">Select qualification</option>
                {qualificationOptions.map((qualification) => (
                  <option key={qualification} value={qualification}>{qualification}</option>
                ))}
              </select>
              {errors.highest_qualification ? <p className={`mt-1 text-red-600 ${bodyTextClassName}`}>{errors.highest_qualification.message}</p> : null}
            </div>
            <FormInput id="specialization" label="Specialization" placeholder="e.g. Software Engineering" required error={errors.specialization?.message} {...register("specialization")} />

          </div>
        </div>

        {/* Section 7: Disability Information */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <h2 className="mb-4 text-[1.0625rem] font-semibold text-slate-900">Section 7: Disability Information</h2>
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

            {isPwd && (
              <div className="grid gap-4 grid-cols-3">
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

        {/* Section 8: Next of Kin */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <h2 className="mb-4 text-[1.0625rem] font-semibold text-slate-900">Section 8: Next of Kin</h2>
          <div className="grid gap-4 grid-cols-3">
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

        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
          <Link to="/staffs" className="sm:w-auto">
            <FormButton type="button" variant="secondary" className="w-full sm:w-auto sm:px-5">
              Cancel
            </FormButton>
          </Link>
          <FormButton type="submit" disabled={isSaving} className="sm:w-auto sm:px-5">
            {isSaving ? "Saving..." : isEdit ? "Update Staff" : "Create Staff"}
          </FormButton>
        </div>
      </form>
    </section>
  );
}

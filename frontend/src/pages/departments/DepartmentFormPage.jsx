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
import { useDepartmentsApi } from "@/hooks/useDepartmentsApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { bodyTextClassName, labelClassName, inputTextClassName, fieldClassName, textAreaClassName } from "@/lib/styles";

const departmentSchema = yup.object({
  code: yup
    .string()
    .required("Department code is required")
    .max(50, "Department code must be at most 50 characters"),
  name: yup
    .string()
    .required("Department name is required")
    .max(255, "Department name must be at most 255 characters"),
  head_of_department: yup.string().nullable(),
  description: yup
    .string()
    .nullable()
    .max(2000, "Description must be at most 2000 characters"),
});

function normalizePayload(values) {
  return {
    code: values.code.trim(),
    name: values.name.trim(),
    head_of_department: values.head_of_department || null,
    description: values.description?.trim() || null,
  };
}

export function DepartmentFormPage() {
  const { departmentId } = useParams();
  const navigate = useNavigate();
  const departmentsApi = useDepartmentsApi();
  const lookupApi = useLookupApi();
  const isEdit = Boolean(departmentId);

  const [selectedHeadOption, setSelectedHeadOption] = useState(null);
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const title = useMemo(
    () => (isEdit ? "Edit Department" : "Add Department"),
    [isEdit],
  );

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(departmentSchema),
    defaultValues: {
      code: "",
      name: "",
      head_of_department: "",
      description: "",
    },
  });

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setIsLoading(true);
      setPageError("");

      try {
        const departmentResponse = isEdit
          ? await departmentsApi.show(departmentId)
          : null;

        if (!isMounted) {
          return;
        }

        if (departmentResponse?.data) {
          reset({
            code: departmentResponse.data.code ?? "",
            name: departmentResponse.data.name ?? "",
            head_of_department:
              departmentResponse.data.head_of_department ?? "",
            description: departmentResponse.data.description ?? "",
          });

          if (departmentResponse.data.head_of_department) {
            setSelectedHeadOption({
              id: departmentResponse.data.head_of_department,
              label: departmentResponse.data.head_of_department_employee_number
                ? `${departmentResponse.data.head_of_department_employee_number} ${departmentResponse.data.head_of_department_name}`
                : departmentResponse.data.head_of_department_name,
            });
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
  }, [departmentId, departmentsApi, isEdit, reset]);

  async function onSubmit(data) {
    setIsSaving(true);
    setPageError("");

    try {
      const payload = normalizePayload(data);

      if (isEdit) {
        await departmentsApi.update(departmentId, payload);
        toast.success("Department updated successfully.");
      } else {
        await departmentsApi.create(payload);
        toast.success("Department created successfully.");
      }

      navigate("/departments", { replace: true });
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

  async function fetchHeadOfDepartmentOptions(query) {
    const response = await lookupApi.search("staffs", {
      query,
      limit: 5,
    });

    return response.data ?? [];
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">{title}</h1>
          <p className="text-[13px] text-slate-500">
            {isEdit
              ? "Update department information and head assignment."
              : "Create a new department and optionally assign a head of department."}
          </p>
        </div>

        <Link
          to="/departments"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to departments
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        {isLoading ? (
          <div className={`text-slate-500 ${bodyTextClassName}`}>
            Loading form...
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {pageError ? (
              <div
                className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}
              >
                {pageError}
              </div>
            ) : null}

            <div className="grid gap-4 grid-cols-3">
              <FormInput
                id="code"
                label="Department Code"
                placeholder="e.g. ICT"
                required
                error={errors.code?.message}
                {...register("code")}
              />

              <FormInput
                id="name"
                label="Department Name"
                placeholder="e.g. Information Technology"
                required
                error={errors.name?.message}
                {...register("name")}
              />

              <Controller
                  name="head_of_department"
                  control={control}
                  render={({ field }) => (
                    <LookupSelect
                      label="Head of Department"
                      value={field.value}
                      selectedOption={selectedHeadOption}
                      onChange={(nextValue, option) => {
                        field.onChange(nextValue);
                        setSelectedHeadOption(option);
                        clearErrors("head_of_department");
                      }}
                      fetchOptions={fetchHeadOfDepartmentOptions}
                      error={errors.head_of_department?.message}
                      placeholder="Type employee number or name"
                      emptyMessage="No staff found."
                    />
                  )}
                />

              <div className="col-span-3">
                <label htmlFor="description" className={labelClassName}>
                  Description
                </label>
                <textarea
                  id="description"
                  className={textAreaClassName}
                  placeholder="Short note about the department"
                  {...register("description")}
                />
                {errors.description ? (
                  <p className={`mt-1 text-red-600 ${bodyTextClassName}`}>
                    {errors.description.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <Link to="/departments" className="sm:w-auto">
                <FormButton
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto sm:px-5"
                >
                  Cancel
                </FormButton>
              </Link>
              <FormButton
                type="submit"
                disabled={isSaving}
                className="sm:w-auto sm:px-5"
              >
                {isSaving
                  ? "Saving..."
                  : isEdit
                    ? "Update Department"
                    : "Create Department"}
              </FormButton>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}


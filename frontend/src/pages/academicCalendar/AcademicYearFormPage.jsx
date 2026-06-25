import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import * as yup from "yup";

import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { useAcademicYearsApi } from "@/hooks/useAcademicYearsApi";
import { bodyTextClassName, labelClassName, selectClassName, textAreaClassName } from "@/lib/styles";
import { getApiErrorMessage } from "@/lib/api/authClient";

const yearSchema = yup.object({
  code: yup
    .string()
    .required("Year code is required")
    .max(50, "Year code must be at most 50 characters"),
  name: yup
    .string()
    .required("Year name is required")
    .max(100, "Year name must be at most 100 characters"),
  description: yup
    .string()
    .nullable()
    .max(2000, "Description must be at most 2000 characters"),
  status: yup.string().oneOf(["active", "ended", "disabled"]).required(),
});

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

function normalizePayload(values) {
  const today = getTodayString();
  let is_active = false;
  let start_date = null;
  let end_date = null;

  if (values.status === "active") {
    is_active = true;
    start_date = today;
  } else if (values.status === "ended") {
    end_date = today;
  }

  return {
    code: values.code.trim(),
    name: values.name.trim(),
    start_date,
    end_date,
    description: values.description?.trim() || null,
    is_active,
  };
}

export function AcademicYearFormPage() {
  const { yearId } = useParams();
  const navigate = useNavigate();
  const yearsApi = useAcademicYearsApi();
  const isEdit = Boolean(yearId);

  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const title = useMemo(
    () => (isEdit ? "Edit Academic Year" : "Add Academic Year"),
    [isEdit],
  );

  const {
    register,
    watch,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(yearSchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      status: "disabled",
    },
  });

  const currentStatus = watch("status");

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setIsLoading(true);
      setPageError("");

      try {
        if (!isEdit) {
          return;
        }

        const response = await yearsApi.show(yearId);

        if (!isMounted) {
          return;
        }

        const year = response.data;
        const hasStartDate = Boolean(year.start_date);
        const hasEndDate = Boolean(year.end_date);
        let status = "disabled";
        if (year.is_active && hasStartDate) {
          status = "active";
        } else if (!year.is_active && hasEndDate) {
          status = "ended";
        }

        reset({
          code: year.code ?? "",
          name: year.name ?? "",
          description: year.description ?? "",
          status,
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

    return () => {
      isMounted = false;
    };
  }, [isEdit, yearId, yearsApi, reset]);

  async function onSubmit(data) {
    setIsSaving(true);
    setPageError("");

    try {
      const payload = normalizePayload(data);

      if (isEdit) {
        await yearsApi.update(yearId, payload);
        toast.success("Academic year updated successfully.");
      } else {
        await yearsApi.create(payload);
        toast.success("Academic year created successfully.");
      }

      navigate("/academic-calendar/years", { replace: true });
    } catch (saveError) {
      const validationErrors = saveError?.response?.data?.errors;

      if (validationErrors) {
        Object.entries(validationErrors).forEach(([key, value]) => {
          setError(key === "is_active" ? "status" : key, {
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

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">{title}</h1>
          <p className="text-[13px] text-slate-500">
            Define an academic year for the institution calendar.
          </p>
        </div>

        <Link
          to="/academic-calendar/years"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to academic years
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        {isLoading ? (
          <div className={`text-slate-500 ${bodyTextClassName}`}>Loading form...</div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {pageError ? (
              <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>
                {pageError}
              </div>
            ) : null}

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <FormInput
                id="code"
                label="Year Code"
                placeholder="e.g. 2024/2025"
                required
                error={errors.code?.message}
                {...register("code")}
              />

              <FormInput
                id="name"
                label="Year Name"
                placeholder="e.g. Academic Year 2024/2025"
                required
                error={errors.name?.message}
                {...register("name")}
              />

              <div>
                <label htmlFor="status" className={labelClassName}>Status</label>
                <select
                  id="status"
                  className={`${selectClassName} w-full`}
                  {...register("status")}
                >
                  <option value="disabled">Disabled</option>
                  <option value="active">Activate</option>
                  <option value="ended">End</option>
                </select>
                <div className={`mt-1.5 space-x-3 text-[13px] text-slate-500`}>
                  {currentStatus === "active" ? (
                    <span>Start date will be set to today.</span>
                  ) : null}
                  {currentStatus === "ended" ? (
                    <span>End date will be set to today.</span>
                  ) : null}
                  {currentStatus === "disabled" ? (
                    <span>Year will be inactive with no dates set.</span>
                  ) : null}
                </div>
              </div>

              <div className="col-span-3">
                <label htmlFor="description" className={labelClassName}>Description</label>
                <textarea
                  id="description"
                  className={textAreaClassName}
                  placeholder="Short note about the academic year"
                  {...register("description")}
                />
                {errors.description ? (
                  <p className={`mt-1 text-red-600 ${bodyTextClassName}`}>{errors.description.message}</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <Link to="/academic-calendar/years" className="sm:w-auto">
                <FormButton type="button" variant="secondary" className="w-full sm:w-auto sm:px-5">Cancel</FormButton>
              </Link>
              <FormButton type="submit" disabled={isSaving} className="sm:w-auto sm:px-5">
                {isSaving ? "Saving..." : isEdit ? "Update Year" : "Create Year"}
              </FormButton>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

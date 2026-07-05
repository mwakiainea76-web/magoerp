import { yupResolver } from "@hookform/resolvers/yup";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import * as yup from "yup";

import { FormButton } from "@/components/FormButton";
import { LookupSelect } from "@/components/LookupSelect";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { bodyTextClassName } from "@/lib/styles";
import { getApiErrorMessage } from "@/lib/api/authClient";
import {
  AcademicSessionForm,
  academicSessionSchema,
  defaultAcademicSessionValues,
  normalizeAcademicSessionPayload,
} from "@/pages/academicCalendar/AcademicSessionForm";

const sessionPageSchema = academicSessionSchema.concat(
  yup.object({
    academic_year_id: yup.string().required("Academic year is required"),
  }),
);

function buildInitialValues(session, yearIdFromQuery) {
  if (session) {
    return {
      academic_year_id: session.academic_year_id ?? "",
      code: session.code ?? "",
      name: session.name ?? "",
      description: session.description ?? "",
      start_date: session.start_date ?? "",
      end_date: session.end_date ?? "",
      status: session.is_active ? "active" : "disabled",
    };
  }
  return {
    academic_year_id: yearIdFromQuery ?? "",
    ...defaultAcademicSessionValues,
  };
}

export function AcademicSessionFormPage() {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionsApi = useAcademicSessionsApi();
  const lookupApi = useLookupApi();
  const isEdit = Boolean(sessionId);

  const yearIdFromQuery = searchParams.get("yearId") ?? "";
  const yearCodeFromQuery = searchParams.get("yearCode") ?? "";
  const yearNameFromQuery = searchParams.get("yearName") ?? "";

  const [selectedYear, setSelectedYear] = useState(null);
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(!isEdit);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionData, setSessionData] = useState(null);

  const title = useMemo(
    () => (isEdit ? "Edit Academic Session" : "Add Academic Session"),
    [isEdit],
  );

  const formValues = useMemo(
    () => buildInitialValues(sessionData, yearIdFromQuery),
    [sessionData, yearIdFromQuery],
  );

  const {
    register,
    control,
    watch,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(sessionPageSchema),
    values: formValues,
  });

  const load = useCallback(async () => {
    setIsLoading(true);
    setPageError("");

    try {
      if (isEdit) {
        const response = await sessionsApi.show(sessionId);
        setSessionData(response.data);
        setSelectedYear({
          id: response.data.academic_year_id,
          label: `${response.data.academic_year_code} ${response.data.academic_year_name}`,
        });
      } else if (yearIdFromQuery) {
        setSelectedYear({
          id: yearIdFromQuery,
          label: [yearCodeFromQuery, yearNameFromQuery].filter(Boolean).join(" ").trim(),
        });
      }
    } catch (loadError) {
      setPageError(getApiErrorMessage(loadError, "Server error."));
    } finally {
      setIsLoading(false);
    }
  }, [isEdit, sessionId, yearIdFromQuery, yearCodeFromQuery, yearNameFromQuery, sessionsApi]);

  useEffect(() => {
    load();
  }, [load]);

  async function fetchYearOptions(query) {
    const response = await lookupApi.search("academic-years", {
      query,
      limit: 5,
    });
    return response.data ?? [];
  }

  async function onSubmit(data) {
    setIsSaving(true);
    setPageError("");

    try {
      const payload = normalizeAcademicSessionPayload(data, data.academic_year_id);

      if (isEdit) {
        await sessionsApi.update(sessionId, payload);
        toast.success("Academic session updated successfully.");
      } else {
        await sessionsApi.create(payload);
        toast.success("Academic session created successfully.");
      }

      navigate("/admin/academic-calendar/sessions", { replace: true });
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

  const yearField = (
    <Controller
      name="academic_year_id"
      control={control}
      render={({ field }) => (
        <LookupSelect
          label="Academic Year"
          value={field.value}
          required
          selectedOption={selectedYear}
          onChange={(nextValue, option) => {
            field.onChange(nextValue);
            setSelectedYear(option);
            clearErrors("academic_year_id");
          }}
          fetchOptions={fetchYearOptions}
          error={errors.academic_year_id?.message}
          placeholder="Type year code or name"
          emptyMessage="No academic year found."
        />
      )}
    />
  );

  const footer = (
    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
      <Link to="/admin/academic-calendar/sessions" className="sm:w-auto">
        <FormButton type="button" variant="secondary" className="w-full sm:w-auto sm:px-5">
          Cancel
        </FormButton>
      </Link>
      <FormButton type="submit" disabled={isSaving} className="sm:w-auto sm:px-5">
        {isSaving ? "Saving..." : isEdit ? "Update Session" : "Create Session"}
      </FormButton>
    </div>
  );

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
            {title}
          </h1>
          <p className="text-[13px] text-slate-500">
            Link a session code and name to its academic year.
          </p>
        </div>

        <Link
          to="/admin/academic-calendar/sessions"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sessions
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        {isLoading ? (
          <div className={`text-slate-500 ${bodyTextClassName}`}>Loading form...</div>
        ) : (
          <AcademicSessionForm
            onSubmit={handleSubmit(onSubmit)}
            register={register}
            watch={watch}
            errors={errors}
            formError={pageError}
            yearField={yearField}
            footer={footer}
          />
        )}
      </div>
    </section>
  );
}

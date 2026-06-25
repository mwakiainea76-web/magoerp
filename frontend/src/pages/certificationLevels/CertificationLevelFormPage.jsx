import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import toast from "react-hot-toast";
import * as yup from "yup";

import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { LookupSelect } from "@/components/LookupSelect";
import { useCertificationLevelsApi } from "@/hooks/useCertificationLevelsApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { bodyTextClassName, labelClassName, inputTextClassName, textAreaClassName } from "@/lib/styles";

const levelSchema = yup.object({
  certification_authority_id: yup
    .string()
    .required("Certification authority is required"),
  code: yup
    .string()
    .required("Level code is required")
    .max(50, "Level code must be at most 50 characters"),
  name: yup
    .string()
    .required("Level name is required")
    .max(100, "Level name must be at most 100 characters"),
  entry_grade: yup
    .string()
    .nullable()
    .max(100, "Entry grade must be at most 100 characters"),
  description: yup
    .string()
    .nullable()
    .max(2000, "Description must be at most 2000 characters"),
  is_active: yup.boolean().required(),
});

function normalizePayload(values) {
  return {
    certification_authority_id: values.certification_authority_id,
    code: values.code.trim(),
    name: values.name.trim(),
    entry_grade: values.entry_grade?.trim() || null,
    description: values.description?.trim() || null,
    is_active: Boolean(values.is_active),
  };
}

export function CertificationLevelFormPage() {
  const { levelId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const levelsApi = useCertificationLevelsApi();
  const lookupApi = useLookupApi();
  const isEdit = Boolean(levelId);

  const authorityIdFromQuery = searchParams.get("authorityId") ?? "";
  const authorityCodeFromQuery = searchParams.get("authorityCode") ?? "";
  const authorityNameFromQuery = searchParams.get("authorityName") ?? "";

  const [selectedAuthority, setSelectedAuthority] = useState(null);
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const title = useMemo(
    () => (isEdit ? "Edit Certification Level" : "Add Certification Level"),
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
    resolver: yupResolver(levelSchema),
    defaultValues: {
      certification_authority_id: authorityIdFromQuery,
      code: "",
      name: "",
      entry_grade: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setIsLoading(true);
      setPageError("");

      try {
        if (!isEdit) {
          if (authorityIdFromQuery && isMounted) {
            reset({
              certification_authority_id: authorityIdFromQuery,
              code: "",
              name: "",
              entry_grade: "",
              description: "",
              is_active: true,
            });
            setSelectedAuthority({
              id: authorityIdFromQuery,
              label: [authorityCodeFromQuery, authorityNameFromQuery]
                .filter(Boolean)
                .join(" ")
                .trim(),
            });
          }

          return;
        }

        const response = await levelsApi.show(levelId);

        if (!isMounted) {
          return;
        }

        const level = response.data;

        reset({
          certification_authority_id: level.certification_authority_id ?? "",
          code: level.code ?? "",
          name: level.name ?? "",
          entry_grade: level.entry_grade ?? "",
          description: level.description ?? "",
          is_active: level.is_active ?? true,
        });
        setSelectedAuthority({
          id: level.certification_authority_id,
          label: `${level.certification_authority_code} ${level.certification_authority_name}`,
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
  }, [
    authorityCodeFromQuery,
    authorityIdFromQuery,
    authorityNameFromQuery,
    isEdit,
    levelId,
    levelsApi,
    reset,
  ]);

  async function fetchAuthorityOptions(query) {
    const response = await lookupApi.search("certification-authorities", {
      query,
      limit: 5,
    });

    return response.data ?? [];
  }

  async function onSubmit(data) {
    setIsSaving(true);
    setPageError("");

    try {
      const payload = normalizePayload(data);

      if (isEdit) {
        await levelsApi.update(levelId, payload);
        toast.success("Certification level updated successfully.");
      } else {
        await levelsApi.create(payload);
        toast.success("Certification level created successfully.");
      }

      navigate("/certification-levels", { replace: true });
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

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">{title}</h1>
          <p className="text-[13px] text-slate-500">
            Link a level code and name to its certification authority.
          </p>
        </div>

        <Link
          to="/certification-levels"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to levels
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

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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
                        clearErrors("certification_authority_id");
                      }}
                      fetchOptions={fetchAuthorityOptions}
                      error={errors.certification_authority_id?.message}
                      placeholder="Type authority code or name"
                      emptyMessage="No authority found."
                    />
                  )}
                />

              <FormInput
                id="code"
                label="Level Code"
                placeholder="e.g. L4"
                required
                error={errors.code?.message}
                {...register("code")}
              />

              <FormInput
                id="name"
                label="Level Name"
                placeholder="e.g. Level 4"
                required
                error={errors.name?.message}
                {...register("name")}
              />

              <FormInput
                id="entry_grade"
                label="Entry Grade"
                placeholder="e.g. KCSE C-"
                error={errors.entry_grade?.message}
                {...register("entry_grade")}
              />

                            <label className="flex items-center gap-3 rounded-2xl px-1 py-2 text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600 focus:ring-emerald-500"
                  {...register("is_active")}
                />
                <span className={bodyTextClassName}>
                  Level is active and available for assignment.
                </span>
              </label>

              <div className="col-span-3">
                <label htmlFor="description" className={labelClassName}>
                  Description
                </label>
                <textarea
                  id="description"
                  className={textAreaClassName}
                  placeholder="Short note about the level"
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
              <Link
                to="/certification-levels"
                className="sm:w-auto"
              >
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
                    ? "Update Level"
                    : "Create Level"}
              </FormButton>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}


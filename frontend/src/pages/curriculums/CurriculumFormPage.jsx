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
import { useCurriculumsApi } from "@/hooks/useCurriculumsApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { bodyTextClassName, labelClassName, inputTextClassName, fieldClassName, textAreaClassName } from "@/lib/styles";

const curriculumSchema = yup.object({
  certification_authority_id: yup
    .string()
    .required("Certification authority is required"),
  code: yup
    .string()
    .required("Curriculum code is required")
    .max(50, "Curriculum code must be at most 50 characters"),
  name: yup
    .string()
    .required("Curriculum name is required")
    .max(255, "Curriculum name must be at most 255 characters"),
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
    description: values.description?.trim() || null,
    is_active: Boolean(values.is_active),
  };
}

export function CurriculumFormPage() {
  const { curriculumId } = useParams();
  const navigate = useNavigate();
  const curriculumsApi = useCurriculumsApi();
  const lookupApi = useLookupApi();
  const isEdit = Boolean(curriculumId);

  const [selectedAuthority, setSelectedAuthority] = useState(null);
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const title = useMemo(
    () => (isEdit ? "Edit Curriculum" : "Add Curriculum"),
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
    resolver: yupResolver(curriculumSchema),
    defaultValues: {
      certification_authority_id: "",
      code: "",
      name: "",
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
          return;
        }

        const response = await curriculumsApi.show(curriculumId);

        if (!isMounted) {
          return;
        }

        const curriculum = response.data;

        reset({
          certification_authority_id: curriculum.certification_authority_id ?? "",
          code: curriculum.code ?? "",
          name: curriculum.name ?? "",
          description: curriculum.description ?? "",
          is_active: curriculum.is_active ?? true,
        });
        setSelectedAuthority({
          id: curriculum.certification_authority_id,
          label: `${curriculum.certification_authority_code} ${curriculum.certification_authority_name}`,
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
  }, [curriculumId, curriculumsApi, isEdit, reset]);

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
        await curriculumsApi.update(curriculumId, payload);
        toast.success("Curriculum updated successfully.");
      } else {
        await curriculumsApi.create(payload);
        toast.success("Curriculum created successfully.");
      }

      navigate("/curriculums", { replace: true });
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
            Create or update curriculum definitions used across courses and units.
          </p>
        </div>

        <Link
          to="/curriculums"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to curriculums
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
                label="Curriculum Code"
                placeholder="e.g. DIP-CS"
                required
                error={errors.code?.message}
                {...register("code")}
              />

              <FormInput
                id="name"
                label="Curriculum Name"
                placeholder="e.g. Diploma in Computer Science"
                required
                error={errors.name?.message}
                {...register("name")}
              />

                            <label className="flex items-center gap-3 rounded-2xl px-1 py-2 text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600 focus:ring-emerald-500"
                  {...register("is_active")}
                />
                <span className={bodyTextClassName}>
                  Curriculum is active and available for course assignment.
                </span>
              </label>

              <div className="col-span-3">
                <label htmlFor="description" className={labelClassName}>
                  Description
                </label>
                <textarea
                  id="description"
                  className={textAreaClassName}
                  placeholder="Short note about the curriculum"
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
              <Link to="/curriculums" className="sm:w-auto">
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
                    ? "Update Curriculum"
                    : "Create Curriculum"}
              </FormButton>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft, Layers3 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import * as yup from "yup";

import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { useCertificationAuthoritiesApi } from "@/hooks/useCertificationAuthoritiesApi";
import {
  bodyTextClassName,
  labelClassName,
  inputTextClassName,
  textAreaClassName,
} from "@/lib/styles";

const authoritySchema = yup.object({
  code: yup
    .string()
    .required("Authority code is required")
    .max(50, "Authority code must be at most 50 characters"),
  name: yup
    .string()
    .required("Authority name is required")
    .max(255, "Authority name must be at most 255 characters"),
  description: yup
    .string()
    .nullable()
    .max(2000, "Description must be at most 2000 characters"),
  is_active: yup.boolean().required(),
});

function normalizePayload(values) {
  return {
    code: values.code.trim(),
    name: values.name.trim(),
    description: values.description?.trim() || null,
    is_active: Boolean(values.is_active),
  };
}

export function CertificationAuthorityFormPage() {
  const { authorityId } = useParams();
  const navigate = useNavigate();
  const authoritiesApi = useCertificationAuthoritiesApi();
  const isEdit = Boolean(authorityId);

  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [existingLevels, setExistingLevels] = useState([]);

  const title = useMemo(
    () =>
      isEdit ? "Edit Certification Authority" : "Add Certification Authority",
    [isEdit],
  );

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(authoritySchema),
    defaultValues: {
      code: "",
      name: "",
      description: "",
      is_active: true,
    },
  });

  const authorityCode = watch("code");
  const authorityName = watch("name");
  const addLevelUrl = useMemo(() => {
    if (!isEdit || !authorityId) {
      return "/admin/certification-levels/create";
    }

    const params = new URLSearchParams({
      authorityId,
      authorityCode: authorityCode ?? "",
      authorityName: authorityName ?? "",
    });

    return `/certification-levels/create?${params.toString()}`;
  }, [authorityCode, authorityId, authorityName, isEdit]);

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setIsLoading(true);
      setPageError("");

      try {
        if (!isEdit) {
          if (isMounted) {
            setExistingLevels([]);
          }
          return;
        }

        const response = await authoritiesApi.show(authorityId);

        if (!isMounted) {
          return;
        }

        const authority = response.data;

        reset({
          code: authority.code ?? "",
          name: authority.name ?? "",
          description: authority.description ?? "",
          is_active: authority.is_active ?? true,
        });
        setExistingLevels(authority.levels ?? []);
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
  }, [authorityId, authoritiesApi, isEdit, reset]);

  async function onSubmit(data) {
    setIsSaving(true);
    setPageError("");

    try {
      const payload = normalizePayload(data);

      if (isEdit) {
        await authoritiesApi.update(authorityId, payload);
        toast.success("Certification authority updated successfully.");
      } else {
        await authoritiesApi.create(payload);
        toast.success("Certification authority created successfully.");
      }
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
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
            {title}
          </h1>
          <p className="text-[13px] text-slate-500">
            Define an examining or awarding authority before attaching its
            certification levels.
          </p>
        </div>

        <Link
          to="/admin/certification-authorities"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to authorities
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
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
                <FormInput
                  id="code"
                  label="Authority Code"
                  placeholder="e.g. CDACC"
                  required
                  error={errors.code?.message}
                  {...register("code")}
                />

                <FormInput
                  id="name"
                  label="Authority Name"
                  placeholder="e.g. CDACC"
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
                    Authority is active .
                  </span>
                </label>

                <div className="col-span-3">
                  <label htmlFor="description" className={labelClassName}>
                    Description
                  </label>
                  <textarea
                    id="description"
                    className={textAreaClassName}
                    placeholder="Short note about the certification authority"
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
                  to="/admin/certification-authorities"
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
                      ? "Update Authority"
                      : "Create Authority"}
                </FormButton>
              </div>
            </form>
          )}
        </div>

        <aside className="rounded-xl border border-slate-200/80 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
              <Layers3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[1.0625rem] font-semibold text-slate-900">
                Linked Levels
              </h2>
              <p className={`text-slate-500 ${bodyTextClassName}`}>
                Levels belonging to this authority.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {existingLevels.length > 0 ? (
              existingLevels.map((level) => (
                <div
                  key={level.id}
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{level.name}</p>
                      <p className="text-sm text-slate-500">{level.code}</p>
                      {level.entry_grade ? (
                        <p className="text-sm text-slate-500">
                          Entry grade: {level.entry_grade}
                        </p>
                      ) : null}
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {level.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className={`mt-1 text-slate-500 ${bodyTextClassName}`}>
                    {level.description || "No description"}
                  </p>
                </div>
              ))
            ) : (
              <div
                className={`rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-slate-500 ${bodyTextClassName}`}
              >
                {isEdit
                  ? "No certification levels linked yet. Create levels after saving this authority."
                  : "Save this authority first, then add its certification levels."}
              </div>
            )}
          </div>

          {isEdit ? (
            <Link to={addLevelUrl} className="mt-5 block">
              <FormButton variant="secondary" className="w-full">
                Add Certification Level
              </FormButton>
            </Link>
          ) : (
            <FormButton variant="secondary" className="mt-5 w-full" disabled>
              Save Authority First
            </FormButton>
          )}
        </aside>
      </div>
    </section>
  );
}

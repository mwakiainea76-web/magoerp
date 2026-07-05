import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import * as yup from "yup";

import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { useFeeTemplatesApi } from "@/hooks/useFeeTemplatesApi";
import { bodyTextClassName, labelClassName, textAreaClassName } from "@/lib/styles";
import { getApiErrorMessage } from "@/lib/api/authClient";

const templateSchema = yup.object({
  code: yup
    .string()
    .required("Code is required")
    .max(50, "Code must be at most 50 characters"),
  name: yup
    .string()
    .required("Template name is required")
    .max(255, "Template name must be at most 255 characters"),
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

export function FeeTemplateFormPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const templatesApi = useFeeTemplatesApi();
  const isEdit = Boolean(templateId);

  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const title = useMemo(
    () => (isEdit ? "Edit Fee Template" : "Add Fee Template"),
    [isEdit],
  );

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(templateSchema),
    defaultValues: {
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

        const response = await templatesApi.show(templateId);
        if (!isMounted) return;

        const template = response.data;
        reset({
          code: template.code ?? "",
          name: template.name ?? "",
          description: template.description ?? "",
          is_active: template.is_active ?? true,
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
  }, [isEdit, templateId, templatesApi, reset]);

  async function onSubmit(data) {
    setIsSaving(true);
    setPageError("");

    try {
      const payload = normalizePayload(data);

      if (isEdit) {
        await templatesApi.update(templateId, payload);
        toast.success("Fee template updated successfully.");
      } else {
        await templatesApi.create(payload);
        toast.success("Fee template created successfully.");
      }

      navigate("/admin/finance/fee-templates", { replace: true });
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
            Create or update a fee template.
          </p>
        </div>

        <Link
          to="/admin/finance/fee-templates"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to fee templates
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
                label="Template Code"
                placeholder="e.g. 2026-S1"
                required
                error={errors.code?.message}
                {...register("code")}
              />

              <FormInput
                id="name"
                label="Template Name"
                placeholder="e.g. 2026 Fee Template Session 1"
                required
                error={errors.name?.message}
                {...register("name")}
              />

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  {...register("is_active")}
                />
                <span className={bodyTextClassName}>Template is active and available for assignment.</span>
              </label>

              <div className="col-span-3">
                <label htmlFor="description" className={labelClassName}>Description</label>
                <textarea
                  id="description"
                  className={textAreaClassName}
                  placeholder="Short note about the fee template"
                  {...register("description")}
                />
                {errors.description ? (
                  <p className={`mt-1 text-red-600 ${bodyTextClassName}`}>{errors.description.message}</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <Link to="/admin/finance/fee-templates" className="sm:w-auto">
                <FormButton type="button" variant="secondary" className="w-full sm:w-auto sm:px-5">Cancel</FormButton>
              </Link>
              <FormButton type="submit" disabled={isSaving} className="sm:w-auto sm:px-5">
                {isSaving ? "Saving..." : isEdit ? "Update Template" : "Create Template"}
              </FormButton>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

export default FeeTemplateFormPage;

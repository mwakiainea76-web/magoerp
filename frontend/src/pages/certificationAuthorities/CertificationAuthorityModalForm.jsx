import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import * as yup from "yup";

import { Modal, ModalBody, ModalFooter } from "@/components/Modal";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { useCertificationAuthoritiesApi } from "@/hooks/useCertificationAuthoritiesApi";
import { getApiErrorMessage } from "@/lib/api/authClient";
import { bodyTextClassName, labelClassName, textAreaClassName } from "@/lib/styles";

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

export function CertificationAuthorityModalForm({
  open,
  onClose,
  authorityId = null,
  onSaved,
}) {
  const authoritiesApi = useCertificationAuthoritiesApi();
  const isEdit = Boolean(authorityId);
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const title = useMemo(
    () => (isEdit ? "Edit Certification Authority" : "Add Certification Authority"),
    [isEdit],
  );

  const {
    register,
    handleSubmit,
    reset,
    setError,
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

  useEffect(() => {
    if (!open) {
      return;
    }

    let isMounted = true;

    async function loadAuthority() {
      setPageError("");

      if (!isEdit) {
        reset({
          code: "",
          name: "",
          description: "",
          is_active: true,
        });
        return;
      }

      setIsLoading(true);

      try {
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

    loadAuthority();

    return () => {
      isMounted = false;
    };
  }, [authorityId, authoritiesApi, isEdit, open, reset]);

  async function onSubmit(data) {
    setIsSaving(true);
    setPageError("");

    try {
      const payload = normalizePayload(data);
      const response = isEdit
        ? await authoritiesApi.update(authorityId, payload)
        : await authoritiesApi.create(payload);

      toast.success(isEdit ? "Certification authority updated successfully." : "Certification authority created successfully.");
      onSaved?.(response?.data ?? null);
      onClose?.();
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
    <Modal
      open={open}
      onClose={isSaving ? undefined : onClose}
      title={title}
      description="Capture the authority code, name, status, and optional notes."
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <ModalBody className="space-y-4">
          {pageError ? (
            <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>
              {pageError}
            </div>
          ) : null}

          {isLoading ? (
            <div className={`text-slate-500 ${bodyTextClassName}`}>Loading form...</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <FormInput
                id="authority_code"
                label="Authority Code"
                placeholder="e.g. CDACC"
                required
                error={errors.code?.message}
                {...register("code")}
              />

              <FormInput
                id="authority_name"
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
                <span className={bodyTextClassName}>Authority is active.</span>
              </label>

              <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <label htmlFor="authority_description" className={labelClassName}>
                  Description
                </label>
                <textarea
                  id="authority_description"
                  className={textAreaClassName}
                  placeholder="Short note about the certification authority"
                  {...register("description")}
                />
                {errors.description ? (
                  <p className={`mt-1 text-red-600 ${bodyTextClassName}`}>{errors.description.message}</p>
                ) : null}
              </div>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <FormButton type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </FormButton>
          <FormButton type="submit" disabled={isSaving || isLoading}>
            {isSaving ? "Saving..." : isEdit ? "Update Authority" : "Create Authority"}
          </FormButton>
        </ModalFooter>
      </form>
    </Modal>
  );
}

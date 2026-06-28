import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import * as yup from "yup";

import { FormButton } from "@/components/FormButton";
import { LookupSelect } from "@/components/LookupSelect";
import { Modal, ModalBody, ModalFooter } from "@/components/Modal";
import { FormInput } from "@/components/FormInput";
import { useCertificationLevelsApi } from "@/hooks/useCertificationLevelsApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { getApiErrorMessage } from "@/lib/api/authClient";
import { bodyTextClassName, labelClassName, textAreaClassName } from "@/lib/styles";

const levelSchema = yup.object({
  certification_authority_id: yup.string().required("Certification authority is required"),
  code: yup
    .string()
    .required("Level code is required")
    .max(50, "Level code must be at most 50 characters"),
  name: yup
    .string()
    .required("Level name is required")
    .max(255, "Level name must be at most 255 characters"),
  entry_grade: yup.string().nullable().max(50, "Entry grade must be at most 50 characters"),
  description: yup.string().nullable().max(2000, "Description must be at most 2000 characters"),
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

export function CertificationLevelModalForm({
  open,
  onClose,
  levelId = null,
  defaultAuthority = null,
  onSaved,
}) {
  const levelsApi = useCertificationLevelsApi();
  const lookupApi = useLookupApi();
  const isEdit = Boolean(levelId);
  const [selectedAuthority, setSelectedAuthority] = useState(defaultAuthority);
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
      certification_authority_id: defaultAuthority?.id ?? "",
      code: "",
      name: "",
      entry_grade: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    let isMounted = true;

    async function loadLevel() {
      setPageError("");

      if (!isEdit) {
        reset({
          certification_authority_id: defaultAuthority?.id ?? "",
          code: "",
          name: "",
          entry_grade: "",
          description: "",
          is_active: true,
        });
        setSelectedAuthority(defaultAuthority);
        return;
      }

      setIsLoading(true);

      try {
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
          label: [level.certification_authority_code, level.certification_authority_name]
            .filter(Boolean)
            .join(" "),
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

    loadLevel();

    return () => {
      isMounted = false;
    };
  }, [defaultAuthority, isEdit, levelId, levelsApi, open, reset]);

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
      const response = isEdit
        ? await levelsApi.update(levelId, payload)
        : await levelsApi.create(payload);

      toast.success(isEdit ? "Certification level updated successfully." : "Certification level created successfully.");
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
      description="Link a level code and name to its certification authority."
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
                    className="lg:col-span-3"
                  />
                )}
              />

              <FormInput
                id="level_code"
                label="Level Code"
                placeholder="e.g. L4"
                required
                error={errors.code?.message}
                {...register("code")}
              />

              <FormInput
                id="level_name"
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

              <label className="flex items-center gap-3 rounded-2xl px-1 py-2 text-slate-700 lg:col-span-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600 focus:ring-emerald-500"
                  {...register("is_active")}
                />
                <span className={bodyTextClassName}>Level is active and available for assignment.</span>
              </label>

              <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <label htmlFor="level_description" className={labelClassName}>
                  Description
                </label>
                <textarea
                  id="level_description"
                  className={textAreaClassName}
                  placeholder="Short note about the level"
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
            {isSaving ? "Saving..." : isEdit ? "Update Level" : "Create Level"}
          </FormButton>
        </ModalFooter>
      </form>
    </Modal>
  );
}

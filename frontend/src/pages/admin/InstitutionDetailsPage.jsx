import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import * as yup from "yup";

import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { useInstitutionApi } from "@/hooks/useInstitutionApi";
import { bodyTextClassName, textAreaClassName, labelClassName } from "@/lib/styles";
import { getApiErrorMessage } from "@/lib/api/authClient";

const institutionSchema = yup.object({
  name: yup
    .string()
    .required("Institution name is required")
    .max(255),
  code: yup
    .string()
    .nullable()
    .max(50),
  postal_address: yup
    .string()
    .nullable()
    .max(2000),
  telephone: yup
    .string()
    .nullable()
    .max(50),
  email: yup
    .string()
    .nullable()
    .email("Invalid email"),
  website: yup
    .string()
    .nullable()
    .max(255),
  motto: yup
    .string()
    .nullable()
    .max(500),
  facebook: yup
    .string()
    .nullable()
    .max(255),
  twitter: yup
    .string()
    .nullable()
    .max(255),
  instagram: yup
    .string()
    .nullable()
    .max(255),
  linkedin: yup
    .string()
    .nullable()
    .max(255),
  youtube: yup
    .string()
    .nullable()
    .max(255),
});

function normalizePayload(values) {
  const payload = {};
  for (const [key, value] of Object.entries(values)) {
    payload[key] = value?.trim() || null;
  }
  return payload;
}

export function InstitutionDetailsPage() {
  const api = useInstitutionApi();

  const [institutionId, setInstitutionId] = useState(null);
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isEdit = institutionId !== null;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(institutionSchema),
    defaultValues: {
      name: "",
      code: "",
      postal_address: "",
      telephone: "",
      email: "",
      website: "",
      motto: "",
      facebook: "",
      twitter: "",
      instagram: "",
      linkedin: "",
      youtube: "",
    },
  });

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setIsLoading(true);
      setPageError("");

      try {
        const res = await api.active();
        if (!isMounted) return;

        const data = res.data;
        if (data) {
          setInstitutionId(data.id);
          reset({
            name: data.name ?? "",
            code: data.code ?? "",
            postal_address: data.postal_address ?? "",
            telephone: data.telephone ?? "",
            email: data.email ?? "",
            website: data.website ?? "",
            motto: data.motto ?? "",
            facebook: data.facebook ?? "",
            twitter: data.twitter ?? "",
            instagram: data.instagram ?? "",
            linkedin: data.linkedin ?? "",
            youtube: data.youtube ?? "",
          });
        } else {
          setInstitutionId(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setPageError(getApiErrorMessage(loadError, "Failed to load institution details."));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPage();
    return () => { isMounted = false; };
  }, [api, reset]);

  async function onSubmit(data) {
    setIsSaving(true);
    setPageError("");

    try {
      const payload = normalizePayload(data);

      if (isEdit) {
        await api.update(institutionId, payload);
        toast.success("Institution details updated successfully.");
      } else {
        const res = await api.create(payload);
        setInstitutionId(res.data.id);
        toast.success("Institution created successfully.");
      }
    } catch (saveError) {
      const validationErrors = saveError?.response?.data?.errors;
      if (validationErrors) {
        Object.entries(validationErrors).forEach(([key, value]) => {
          setError(key, { message: value?.[0] ?? "Invalid value" });
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
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
          {isEdit ? "Institution Details" : "Add Institution"}
        </h1>
        <p className="text-[13px] text-slate-500">
          {isEdit
            ? "Manage institution information, contact details and social media links"
            : "Set up your institution details to get started"}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        {isLoading ? (
          <div className={`text-slate-500 ${bodyTextClassName}`}>Loading...</div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            {pageError ? (
              <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>
                {pageError}
              </div>
            ) : null}

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <FormInput id="name" label="Institution Name" placeholder="e.g. Mago University" required error={errors.name?.message} {...register("name")} />
              <FormInput id="code" label="Short Code" placeholder="e.g. MAGO" error={errors.code?.message} {...register("code")} />
              <FormInput id="telephone" label="Telephone" placeholder="e.g. +254700100200" error={errors.telephone?.message} {...register("telephone")} />
              <FormInput id="email" label="Email" placeholder="e.g. info@mago.ac.ke" error={errors.email?.message} {...register("email")} />
              <FormInput id="website" label="Website" placeholder="e.g. https://mago.ac.ke" error={errors.website?.message} {...register("website")} />
              <FormInput id="motto" label="Motto" placeholder="e.g. Excellence in Education" error={errors.motto?.message} {...register("motto")} />
            </div>

            <div>
              <label htmlFor="postal_address" className={labelClassName}>Postal Address</label>
              <textarea id="postal_address" className={textAreaClassName} placeholder="e.g. P.O. Box 12345-00100, Nairobi" {...register("postal_address")} />
              {errors.postal_address ? <p className={`mt-1 text-red-600 ${bodyTextClassName}`}>{errors.postal_address.message}</p> : null}
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h2 className="text-[15px] font-semibold text-slate-800 mb-3">Social Media Links</h2>
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                <FormInput id="facebook" label="Facebook" placeholder="https://facebook.com/..." error={errors.facebook?.message} {...register("facebook")} />
                <FormInput id="twitter" label="Twitter" placeholder="https://twitter.com/..." error={errors.twitter?.message} {...register("twitter")} />
                <FormInput id="instagram" label="Instagram" placeholder="https://instagram.com/..." error={errors.instagram?.message} {...register("instagram")} />
                <FormInput id="linkedin" label="LinkedIn" placeholder="https://linkedin.com/..." error={errors.linkedin?.message} {...register("linkedin")} />
                <FormInput id="youtube" label="YouTube" placeholder="https://youtube.com/..." error={errors.youtube?.message} {...register("youtube")} />
              </div>
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <FormButton type="submit" disabled={isSaving} className="sm:w-auto sm:px-5">
                {isSaving ? "Saving..." : isEdit ? "Update Institution" : "Create Institution"}
              </FormButton>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

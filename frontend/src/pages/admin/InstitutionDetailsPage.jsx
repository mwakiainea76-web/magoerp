import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import * as yup from "yup";
import { Upload, X } from "lucide-react";

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
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);
  const [logoRemoved, setLogoRemoved] = useState(false);
  const fileInputRef = useRef(null);

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
          setLogoRemoved(false);
          if (data.logo_url) {
            setLogoPreviewUrl(data.logo_url);
          }
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

  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogoPreviewUrl(event.target.result);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveLogo() {
    setLogoFile(null);
    setLogoPreviewUrl(null);
    setLogoRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function onSubmit(data) {
    setIsSaving(true);
    setPageError("");

    try {
      const payload = normalizePayload(data);

      if (logoFile) {
        payload.logo = logoFile;
      }
      if (logoRemoved) {
        payload.remove_logo = "1";
      }

      const res = await api.save(payload, isEdit ? institutionId : null);
      if (!isEdit) {
        setInstitutionId(res.data.id);
      }

      toast.success("Institution details saved successfully.");
      setLogoRemoved(false);

      const refreshed = await api.active();
      if (refreshed?.data?.logo_url) {
        setLogoPreviewUrl(refreshed.data.logo_url);
      } else {
        setLogoPreviewUrl(null);
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

            {/* Logo Upload */}
            <div className="border-b border-slate-200 pb-4">
              <h2 className="text-[15px] font-semibold text-slate-800 mb-3">Institution Logo</h2>
              <div className="flex items-center gap-5">
                <div className="relative flex h-28 w-44 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50">
                  {logoPreviewUrl ? (
                    <>
                      <img
                        src={logoPreviewUrl}
                        alt="Institution logo preview"
                        className="h-full w-full object-contain p-2"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <div className="text-center text-slate-400">
                      <Upload size={28} className="mx-auto mb-1" />
                      <p className="text-[11px]">No logo</p>
                    </div>
                  )}
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpg,image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleLogoChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
                  >
                    Choose Logo
                  </label>
                  <p className="mt-1 text-[11px] text-slate-400">Max 10MB. JPG, PNG, GIF, WebP</p>
                </div>
              </div>
            </div>

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

import { useEffect, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import * as yup from "yup";

import { bodyTextClassName, labelClassName, selectClassName, textAreaClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { useHostelsApi } from "@/hooks/useHostelsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const hostelSchema = yup.object({
  name: yup.string().required("Name is required"),
  code: yup.string().required("Code is required"),
  session_fee_amount: yup.number().nullable().transform((v) => (v === "" || v === null ? null : v)).min(0),
  gender: yup.string().nullable(),
  location: yup.string().nullable(),
  description: yup.string().nullable(),
  is_active: yup.boolean(),
});

export function HostelFormPage() {
  const { hostelId } = useParams();
  const navigate = useNavigate();
  const api = useHostelsApi();
  const isEditing = Boolean(hostelId);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(hostelSchema),
    defaultValues: {
      name: "",
      code: "",
      session_fee_amount: "",
      gender: "",
      location: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (!hostelId) return;
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const res = await api.show(hostelId);
        const h = res.data;
        if (mounted) {
          reset({
            name: h.name ?? "",
            code: h.code ?? "",
            session_fee_amount: String(h.session_fee_amount ?? ""),
            gender: h.gender ?? "",
            location: h.location ?? "",
            description: h.description ?? "",
            is_active: h.is_active ?? true,
          });
        }
      } catch (e) {
        if (mounted) setServerError(getApiErrorMessage(e, "Failed to load hostel."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [hostelId, api, reset]);

  async function onSubmit(data) {
    try {
      const payload = {
        name: data.name.trim(),
        code: data.code.trim(),
        session_fee_amount: Number(data.session_fee_amount) || 0,
        gender: data.gender || null,
        location: data.location?.trim() || null,
        description: data.description?.trim() || null,
        is_active: data.is_active,
      };

      if (isEditing) {
        await api.update(hostelId, payload);
        toast.success("Hostel updated.");
      } else {
        await api.create(payload);
        toast.success("Hostel created.");
      }
    } catch (e) {
      const serverErrors = e?.response?.data?.errors;
      if (serverErrors) {
        Object.entries(serverErrors).forEach(([key, value]) => {
          setError(key, { message: value?.[0] ?? "Invalid value" });
        });
      } else {
        setServerError(getApiErrorMessage(e, "Failed to save hostel."));
      }
    }
  }

  if (isLoading) {
    return <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading...</div>;
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">{isEditing ? "Edit Hostel" : "Add Hostel"}</h1>
          <p className="text-[13px] text-slate-500">{isEditing ? "Update hostel details" : "Register a new hostel facility"}</p>
        </div>
        <Link to="/admin/hostels" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-500 transition hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to hostels
        </Link>
      </div>

      {serverError ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{serverError}</div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormInput id="code" label="Code" placeholder="e.g. MH-A" required error={errors.code?.message} {...register("code")} />
            <FormInput id="name" label="Name" placeholder="e.g. Main Hostel A" required error={errors.name?.message} {...register("name")} />
            <FormInput id="session_fee_amount" label="Session Fee" type="number" step="0.01" min="0" placeholder="e.g. 15000" error={errors.session_fee_amount?.message} {...register("session_fee_amount")} />
            <div>
              <label htmlFor="gender" className={labelClassName}>Gender Restriction</label>
              <select id="gender" className={`${selectClassName} w-full`} {...register("gender")}>
                <option value="">Mixed / No Restriction</option>
                <option value="male">Male Only</option>
                <option value="female">Female Only</option>
              </select>
            </div>
            <FormInput id="location" label="Location" placeholder="e.g. Block A, Floor 1" error={errors.location?.message} {...register("location")} />
            <div>
              <label htmlFor="is_active" className={labelClassName}>Status</label>
              <select id="is_active" className={`${selectClassName} w-full`} {...register("is_active")}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="description" className={labelClassName}>Description</label>
              <textarea id="description" className={textAreaClassName} placeholder="Optional description of the hostel" {...register("description")} />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <FormButton type="button" variant="secondary" onClick={() => navigate("/admin/hostels")}>Cancel</FormButton>
          <FormButton type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : isEditing ? "Update Hostel" : "Create Hostel"}</FormButton>
        </div>
      </form>
    </section>
  );
}

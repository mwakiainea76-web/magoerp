import { useEffect, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useFieldArray, useForm } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Trash2 } from "lucide-react";
import * as yup from "yup";

import { bodyTextClassName, labelClassName, selectClassName, textAreaClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { useHostelsApi } from "@/hooks/useHostelsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const roomSchema = yup.object({
  _id: yup.string().nullable(),
  code: yup.string().required("Room code is required"),
  name: yup.string().required("Room name is required"),
  floor: yup.string().nullable(),
  bed_count: yup.number().min(1, "At least 1 bed").default(1),
  is_active: yup.boolean(),
});

const hostelSchema = yup.object({
  name: yup.string().required("Name is required"),
  code: yup.string().required("Code is required"),
  session_fee_amount: yup.number().nullable().transform((v) => (v === "" || v === null ? null : v)).min(0),
  gender: yup.string().nullable(),
  location: yup.string().nullable(),
  description: yup.string().nullable(),
  is_active: yup.boolean(),
  rooms: yup.array().of(roomSchema),
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
    control,
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
      rooms: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "rooms" });

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
            rooms: (h.rooms ?? []).map((r) => ({
              _id: r.id,
              code: r.code ?? "",
              name: r.name ?? "",
              floor: r.floor ?? "",
              bed_count: r.bed_count ?? 1,
              is_active: r.is_active ?? true,
            })),
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
  }, [hostelId]);

  async function onSubmit(data) {
    try {
      const payload = {
        ...data,
        session_fee_amount: Number(data.session_fee_amount) || 0,
        gender: data.gender || null,
        location: data.location || null,
        description: data.description || null,
        rooms: (data.rooms ?? []).map((r) => ({
          id: r._id,
          code: r.code,
          name: r.name,
          floor: r.floor || null,
          bed_count: Number(r.bed_count) || 1,
        })),
      };

      if (isEditing) {
        await api.update(hostelId, payload);
        toast.success("Hostel updated.");
      } else {
        await api.create(payload);
        toast.success("Hostel created.");
      }
      navigate("/hostels");
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
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">{isEditing ? "Edit Hostel" : "Add Hostel"}</h1>
        <p className="text-[13px] text-slate-500">{isEditing ? "Update hostel details" : "Register a new hostel facility"}</p>
      </div>

      {serverError ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{serverError}</div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormInput id="name" label="Name" placeholder="e.g. Main Hostel A" required error={errors.name?.message} {...register("name")} />
            <FormInput id="code" label="Code" placeholder="e.g. MH-A" required error={errors.code?.message} {...register("code")} />
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

        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-slate-900">Rooms</h2>
            <FormButton type="button" variant="secondary" onClick={() => append({ _id: null, code: "", name: "", floor: "", bed_count: 1, is_active: true })}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Room
            </FormButton>
          </div>

          {fields.length === 0 ? (
            <p className={`text-slate-500 ${bodyTextClassName}`}>No rooms added yet. Click "Add Room" to create rooms with beds.</p>
          ) : (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-end gap-3 rounded-lg border border-slate-100 p-3">
                  <div className="flex-1">
                    <FormInput
                      id={`rooms.${index}.code`}
                      label="Code"
                      placeholder="e.g. R-101"
                      error={errors.rooms?.[index]?.code?.message}
                      {...register(`rooms.${index}.code`)}
                    />
                  </div>
                  <div className="flex-1">
                    <FormInput
                      id={`rooms.${index}.name`}
                      label="Name"
                      placeholder="e.g. Room 101"
                      error={errors.rooms?.[index]?.name?.message}
                      {...register(`rooms.${index}.name`)}
                    />
                  </div>
                  <div className="w-20">
                    <FormInput
                      id={`rooms.${index}.floor`}
                      label="Floor"
                      placeholder="e.g. 1"
                      error={errors.rooms?.[index]?.floor?.message}
                      {...register(`rooms.${index}.floor`)}
                    />
                  </div>
                  <div className="w-24">
                    <FormInput
                      id={`rooms.${index}.bed_count`}
                      label="Beds"
                      type="number"
                      min="1"
                      placeholder="e.g. 2"
                      error={errors.rooms?.[index]?.bed_count?.message}
                      {...register(`rooms.${index}.bed_count`)}
                    />
                  </div>
                  <button type="button" onClick={() => remove(index)} className="mb-px flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <FormButton type="button" variant="secondary" onClick={() => navigate("/hostels")}>Cancel</FormButton>
          <FormButton type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : isEditing ? "Update Hostel" : "Create Hostel"}</FormButton>
        </div>
      </form>
    </section>
  );
}

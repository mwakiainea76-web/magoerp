import { useEffect, useState } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";
import * as yup from "yup";

import { bodyTextClassName, labelClassName, selectClassName, textAreaClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { useLectureRoomsApi } from "@/hooks/useLectureRoomsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const lectureRoomSchema = yup.object({
  name: yup.string().required("Room name is required").max(255),
  code: yup.string().required("Code is required").max(50),
  capacity: yup.number().nullable().transform((v) => (v === "" || v === null ? null : v)).min(1),
  location: yup.string().nullable().max(255),
  description: yup.string().nullable().max(5000),
  is_active: yup.boolean(),
});

export function LectureRoomFormPage() {
  const { roomId } = useParams();
  const isEdit = Boolean(roomId);
  const navigate = useNavigate();
  const api = useLectureRoomsApi();
  const [isLoading, setIsLoading] = useState(isEdit);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(lectureRoomSchema),
    defaultValues: {
      name: "",
      code: "",
      capacity: "",
      location: "",
      description: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (!isEdit) return;
    let mounted = true;
    async function load() {
      try {
        const res = await api.show(roomId);
        if (mounted && res.data) {
          const r = res.data;
          reset({
            name: r.name ?? "",
            code: r.code ?? "",
            capacity: r.capacity ?? "",
            location: r.location ?? "",
            description: r.description ?? "",
            is_active: r.is_active ?? true,
          });
        }
      } catch (e) {
        if (mounted) setError("root", { message: getApiErrorMessage(e, "Failed to load data.") });
      }
    }
    load();
    return () => { mounted = false; };
  }, [isEdit]);

  async function onSubmit(data) {
    const payload = {
      ...data,
      capacity: data.capacity ? Number(data.capacity) : null,
      description: data.description || null,
    };

    try {
      if (isEdit) {
        await api.update(roomId, payload);
        toast.success("Room updated.");
      } else {
        await api.create(payload);
        toast.success("Room created.");
      }
      navigate("/admin/lecture-rooms");
    } catch (e) {
      const serverErrors = e?.response?.data?.errors;
      if (serverErrors) {
        Object.entries(serverErrors).forEach(([key, value]) => {
          setError(key, { message: value?.[0] ?? "Invalid value" });
        });
      } else {
        setError("root", { message: getApiErrorMessage(e, "Failed to save room.") });
      }
    }
  }

  if (isLoading) {
    return <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading...</div>;
  }

  return (
    <section className="space-y-5">
      <button
        type="button"
        onClick={() => navigate("/admin/lecture-rooms")}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Rooms
      </button>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <h1 className="mb-6 text-[18px] font-semibold text-slate-950">
          {isEdit ? "Edit Lecture Room" : "Add Lecture Room"}
        </h1>

        {errors.root ? (
          <div className={`mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{errors.root.message}</div>
        ) : null}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <FormInput
              id="name"
              label="Room Name"
              placeholder="e.g. Main Lecture Hall"
              required
              maxLength={255}
              error={errors.name?.message}
              {...register("name")}
            />
            <FormInput
              id="code"
              label="Code"
              placeholder="e.g. MLH-01"
              required
              maxLength={50}
              error={errors.code?.message}
              {...register("code")}
            />
            <FormInput
              id="capacity"
              label="Capacity"
              type="number"
              placeholder="e.g. 50"
              min={1}
              error={errors.capacity?.message}
              {...register("capacity")}
            />
            <FormInput
              id="location"
              label="Location"
              placeholder="e.g. Block A, Floor 2"
              maxLength={255}
              error={errors.location?.message}
              {...register("location")}
            />
            <div>
              <label htmlFor="is_active" className={labelClassName}>Status</label>
              <select id="is_active" className={`${selectClassName} w-full`} {...register("is_active")}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="description" className={labelClassName}>Description</label>
            <textarea
              id="description"
              className={textAreaClassName}
              placeholder="Optional notes about this room"
              maxLength={5000}
              {...register("description")}
            />
            {errors.description ? <p className="mt-1 text-sm text-red-600">{errors.description.message}</p> : null}
          </div>

          <div className="flex justify-end gap-3">
            <FormButton type="button" variant="secondary" onClick={() => navigate("/admin/lecture-rooms")}>Cancel</FormButton>
            <FormButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : isEdit ? "Update Room" : "Create Room"}
            </FormButton>
          </div>
        </form>
      </div>
    </section>
  );
}

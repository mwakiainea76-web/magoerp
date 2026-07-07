import * as yup from "yup";
import { bodyTextClassName } from "@/lib/styles";
import { FormInput } from "@/components/FormInput";

export const hostelRoomSchema = yup.object({
  code: yup.string().required("Room code is required").max(100),
  name: yup.string().required("Room name is required").max(255),
  floor: yup.string().nullable().max(100),
  bed_count: yup.number().typeError("Must be a number").min(1, "At least 1 bed").required("Bed count is required"),
  is_active: yup.boolean(),
});

export const defaultHostelRoomValues = {
  code: "",
  name: "",
  floor: "",
  bed_count: 1,
  is_active: true,
};

export function normalizeHostelRoomPayload(values, hostelId) {
  return {
    hostel_id: hostelId,
    code: values.code.trim(),
    name: values.name.trim(),
    floor: values.floor?.trim() || null,
    bed_count: Number(values.bed_count) || 1,
  };
}

export function HostelRoomForm({ register, errors, hostelName }) {
  return (
    <div className="space-y-4">
      {hostelName ? (
        <div className={`rounded-lg bg-emerald-50 px-4 py-3 text-emerald-700 ${bodyTextClassName}`}>
          Adding room to: <strong>{hostelName}</strong>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput
          label="Room Code"
          required
          placeholder="e.g. R-101"
          error={errors.code?.message}
          {...register("code")}
        />
        <FormInput
          label="Room Name"
          required
          placeholder="e.g. Room 101"
          error={errors.name?.message}
          {...register("name")}
        />
        <FormInput
          label="Floor"
          placeholder="e.g. 1"
          error={errors.floor?.message}
          {...register("floor")}
        />
        <FormInput
          label="Number of Beds"
          type="number"
          min="1"
          placeholder="e.g. 2"
          error={errors.bed_count?.message}
          {...register("bed_count")}
        />
      </div>
    </div>
  );
}

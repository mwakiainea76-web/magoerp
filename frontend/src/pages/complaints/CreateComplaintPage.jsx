import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import * as yup from "yup";

import { bodyTextClassName, labelClassName, textAreaClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { useComplaintsApi } from "@/hooks/useComplaintsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const complaintSchema = yup.object({
  subject: yup.string().required("Subject is required").max(200),
  description: yup.string().required("Description is required").max(5000),
});

export function CreateComplaintPage() {
  const api = useComplaintsApi();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(complaintSchema),
  });

  async function onSubmit(data) {
    try {
      await api.create(data);
      toast.success("Complaint submitted.");
      navigate("/complaints");
    } catch (e) {
      const serverErrors = e?.response?.data?.errors;
      if (serverErrors) {
        Object.entries(serverErrors).forEach(([key, value]) => {
          setError(key, { message: value?.[0] ?? "Invalid value" });
        });
      } else {
        setError("root", { message: getApiErrorMessage(e, "Failed to submit complaint.") });
      }
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Submit Complaint</h1>
        <p className="text-[13px] text-slate-500">Submit a grievance or complaint for review</p>
      </div>

      {errors.root ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{errors.root.message}</div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <div className="space-y-4">
            <FormInput
              id="subject"
              label="Subject"
              placeholder="Brief title of your complaint"
              required
              maxLength={200}
              error={errors.subject?.message}
              {...register("subject")}
            />
            <div>
              <label htmlFor="description" className={labelClassName}>Description <span className="text-red-400"> *</span></label>
              <textarea
                id="description"
                className={textAreaClassName}
                placeholder="Provide a detailed description of your complaint..."
                {...register("description")}
              />
              {errors.description ? <p className="mt-1 text-sm text-red-600">{errors.description.message}</p> : null}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <FormButton type="button" variant="secondary" onClick={() => navigate("/complaints")}>Cancel</FormButton>
          <FormButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Complaint"}
          </FormButton>
        </div>
      </form>
    </section>
  );
}

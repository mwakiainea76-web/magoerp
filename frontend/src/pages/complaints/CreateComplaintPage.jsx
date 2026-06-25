import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { bodyTextClassName, labelTextClassName, inputClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useComplaintsApi } from "@/hooks/useComplaintsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function CreateComplaintPage() {
  const api = useComplaintsApi();
  const navigate = useNavigate();

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!subject.trim() || !description.trim()) {
      setError("Subject and description are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.create({ subject: subject.trim(), description: description.trim() });
      toast.success("Complaint submitted.");
      navigate("/complaints");
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to submit complaint."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Submit Complaint</h1>
        <p className="text-[13px] text-slate-500">Submit a grievance or complaint for review</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <div className="space-y-4">
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={inputClassName}
                placeholder="Brief title of your complaint"
                required
                maxLength={200}
              />
            </div>
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${inputClassName} min-h-[160px] resize-y py-3`}
                placeholder="Provide a detailed description of your complaint..."
                required
                maxLength={5000}
              />
            </div>
          </div>
        </div>

        {error ? (
          <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
        ) : null}

        <div className="flex justify-end gap-3">
          <FormButton type="button" variant="secondary" onClick={() => navigate("/complaints")}>
            Cancel
          </FormButton>
          <FormButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Complaint"}
          </FormButton>
        </div>
      </form>
    </section>
  );
}

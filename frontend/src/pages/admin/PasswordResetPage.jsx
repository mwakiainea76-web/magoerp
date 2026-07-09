import { useState } from "react";
import { KeyRound } from "lucide-react";
import toast from "react-hot-toast";

import { authClient, getApiErrorMessage } from "@/lib/api/authClient";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";

const modes = {
  staff: {
    label: "Staff",
    inputLabel: "Employee Number",
    inputPlaceholder: "Enter employee number e.g. EMP/001/25",
    endpoint: "/admin/reset-staff-password",
    payloadKey: "employee_number",
    successMsg: "Staff password has been reset. They must change it on next login.",
  },
  student: {
    label: "Student",
    inputLabel: "Admission Number",
    inputPlaceholder: "Enter admission number",
    endpoint: "/admin/reset-student-password",
    payloadKey: "admission_number",
    successMsg: "Student password has been reset to their registered phone number. They must change it on next login.",
  },
};

export function PasswordResetPage({ mode = "staff" }) {
  const config = modes[mode];
  const [identifier, setIdentifier] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!identifier.trim()) return;

    setIsSaving(true);
    setError("");

    try {
      await authClient.post(config.endpoint, { [config.payloadKey]: identifier.trim() });
      toast.success(config.successMsg);
      setIdentifier("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to reset password."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
          Reset {config.label} Password
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Reset the password for a {config.label.toLowerCase()}. They will be required to change it on next login.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50/50 text-emerald-700">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold text-slate-800">Reset {config.label} Password</h2>
            <p className="mt-1 text-[13px] leading-5 text-slate-500">
              Enter the {config.label.toLowerCase()}&apos;s {config.inputLabel.toLowerCase()} to reset their password.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </div>
          )}

          <FormInput
            id="identifier"
            label={config.inputLabel}
            required
            placeholder={config.inputPlaceholder}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <FormButton type="submit" disabled={isSaving || !identifier.trim()}>
              {isSaving ? "Resetting..." : "Reset Password"}
            </FormButton>
          </div>
        </form>
      </div>
    </section>
  );
}

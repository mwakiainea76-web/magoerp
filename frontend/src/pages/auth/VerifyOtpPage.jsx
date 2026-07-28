import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { useAuthApi } from "@/hooks/useAuthApi";
import { useAuthStore } from "@/store/authStore";
import { getDashboardPath } from "@/support/dashboardPaths";

export function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { verifyOtp } = useAuthApi();
  const setAuth = useAuthStore((state) => state.setAuth);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const temporaryToken = location.state?.temporary_token;
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (token && user) {
    return (
      <Navigate
        to={user.must_reset_password ? "/reset-password" : getDashboardPath(user.role)}
        replace
      />
    );
  }

  if (!temporaryToken) {
    return (
      <Navigate to="/login" replace />
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (otp.length !== 6) {
      setError("OTP must be 6 digits.");
      return;
    }

    setIsLoading(true);
    try {
      const payload = await verifyOtp({ temporaryToken, otp });
      setAuth({ token: payload.token, user: payload.user });
      navigate(
        payload.user?.must_reset_password
          ? "/reset-password"
          : getDashboardPath(payload.user?.role),
        { replace: true },
      );
    } catch (e) {
      setError(e?.response?.data?.message ?? "Verification failed. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="px-6 py-7 sm:px-8 sm:py-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-800">Verify OTP</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter the 6-digit code sent to your email
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormInput
            id="otp"
            label="OTP Code"
            placeholder="000000"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            error={error}
            inputClassName="text-center text-lg tracking-[0.5em]"
          />

          <FormButton className="mt-4 w-full" type="submit" disabled={isLoading}>
            {isLoading ? "Verifying..." : "Verify"}
          </FormButton>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate("/login", { replace: true })}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

export default VerifyOtpPage;

import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import * as yup from "yup";

import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { useAuthApi } from "@/hooks/useAuthApi";
import { getApiErrorMessage } from "@/lib/api/authClient";
import { useAuthStore } from "@/store/authStore";
import { getDashboardPath } from "@/support/dashboardPaths";

const resetSchema = yup.object({
  currentPassword: yup.string().required("Current password is required"),
  password: yup.string().required("New password is required").min(6, "Password must be at least 6 characters"),
  passwordConfirmation: yup
    .string()
    .required("Please confirm the new password")
    .oneOf([yup.ref("password")], "Passwords must match"),
});

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const { changePassword, logout } = useAuthApi();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(resetSchema),
    defaultValues: {
      currentPassword: "",
      password: "",
      passwordConfirmation: "",
    },
  });

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!user?.must_reset_password) {
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }

  async function onSubmit(data) {
    setIsSubmitting(true);

    try {
      const payload = await changePassword({
        currentPassword: data.currentPassword,
        password: data.password,
        passwordConfirmation: data.passwordConfirmation,
      });

      setAuth({ token, user: payload.user });
      navigate(getDashboardPath(payload.user?.role), { replace: true });
    } catch (error) {
      const serverErrors = error?.response?.data?.errors;

      if (serverErrors) {
        Object.entries(serverErrors).forEach(([key, value]) => {
          const fieldMap = {
            current_password: "currentPassword",
            password: "password",
            password_confirmation: "passwordConfirmation",
          };

          setError(fieldMap[key] ?? key, {
            message: value?.[0] ?? "Invalid value",
          });
        });
      } else {
        setError("root", {
          message: getApiErrorMessage(error, "Failed to update password."),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
    } finally {
      useAuthStore.getState().clearAuth();
      navigate("/login", { replace: true });
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl py-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_22px_50px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200/80 bg-white px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
                <KeyRound className="h-3.5 w-3.5" />
                First Login Required
              </div>
              <h1 className="text-[24px] font-semibold tracking-[-0.02em] text-slate-950">Set your new password</h1>

            </div>
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-5">
              <FormInput
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                label="Current Password"
                placeholder="Enter your current password"
                required
                error={errors.currentPassword?.message}
                rightIcon={showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                onRightIconClick={() => setShowCurrentPassword((prev) => !prev)}
                {...register("currentPassword")}
              />

              <FormInput
                id="password"
                type={showPassword ? "text" : "password"}
                label="New Password"
                placeholder="Choose a new password"
                required
                error={errors.password?.message}
                rightIcon={showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                onRightIconClick={() => setShowPassword((prev) => !prev)}
                {...register("password")}
              />
              <FormInput
                id="passwordConfirmation"
                type={showPasswordConfirmation ? "text" : "password"}
                label="Confirm New Password"
                placeholder="Re-enter the new password"
                required
                error={errors.passwordConfirmation?.message}
                rightIcon={showPasswordConfirmation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                onRightIconClick={() => setShowPasswordConfirmation((prev) => !prev)}
                {...register("passwordConfirmation")}
              />
            </div>

            {errors.root ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {errors.root.message}
              </div>
            ) : null}

            <div className="flex flex-col gap-4 border-t border-slate-200/80 pt-5 sm:flex-row sm:items-center sm:justify-between">

              <div className="flex w-full flex-col items-stretch gap-3 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                <FormButton
                  type="button"
                  variant="secondary"
                  className="w-full rounded-xl border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 sm:w-auto"
                  disabled={isLoggingOut}
                  onClick={handleLogout}
                >
                  {isLoggingOut ? "Signing out..." : "Sign Out"}
                </FormButton>
                <FormButton
                  type="submit"
                  className="w-full rounded-xl px-6 py-3 text-sm font-semibold sm:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving..." : "Update Password"}
                </FormButton>
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

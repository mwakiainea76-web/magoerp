import { yupResolver } from "@hookform/resolvers/yup";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import * as yup from "yup";

import logo from "@/assets/logo.PNG";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { useAuthApi } from "@/hooks/useAuthApi";
import { useAuthStore } from "@/store/authStore";
import { getDashboardPath } from "@/support/dashboardPaths";

const loginSchema = yup.object({
  username: yup.string().required("Login ID is required"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthApi();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  async function onSubmit(data) {
    setIsLoading(true);

    try {
      const payload = await login({
        loginId: data.username,
        password: data.password,
      });

      setAuth({
        token: payload.token,
        user: payload.user,
      });

      navigate(getDashboardPath(payload.user?.role), {
        replace: true,
      });
    } catch (error) {
      const statusCode = error?.response?.status;
      const message =
        statusCode === 403
          ? "Your account is disabled. Contact administrator."
          : statusCode
            ? "Invalid credentials."
            : "Server error.";

      setError("root", {
        message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="px-6 py-7 sm:px-8 sm:py-8">
        <div className="mb-6 text-center">
          <img
            src={logo}
            alt="MAGO TVTC"
            className="mx-auto h-12 object-contain"
          />
          <h1 className="mt-3 text-2xl font-semibold text-slate-800">
            Welcome Back
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Sign in with your login ID to continue
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormInput
              id="username"
              label="Username"
              placeholder="Enter your username"
              required
              error={errors.username?.message}
              {...register("username")}
            />

            <FormInput
              id="password"
              type="password"
              label="Password"
              placeholder="Enter your password"
              required
              error={errors.password?.message}
              {...register("password")}
            />

            {errors.root && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {errors.root.message}
              </div>
            )}
            <FormButton type="submit" disabled={isLoading}>
              {isLoading ? "Signing In..." : "Sign In"}
            </FormButton>
            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>
          </form>
      </div>
    </section>
  );
}

export default LoginPage;

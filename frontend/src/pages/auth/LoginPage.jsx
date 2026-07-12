import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import * as yup from "yup";

import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { useAuthApi } from "@/hooks/useAuthApi";
import { useAuthStore } from "@/store/authStore";
import { getDashboardPath } from "@/support/dashboardPaths";
import { authClient } from "@/lib/api/authClient";

const loginSchema = yup.object({
  username: yup.string().required("Username is required"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Password must be at least 6 characters"),
});

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthApi();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    authClient.get("/institution/logo").then((res) => {
      const url = res?.data?.logo_url;
      if (url) setLogoUrl(url);
    }).catch(() => {});
  }, []);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  if (token && user) {
    const nextPath = user.must_reset_password
      ? "/reset-password"
      : location.state?.from?.pathname ?? getDashboardPath(user.role);

    return <Navigate to={nextPath} replace />;
  }

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

      navigate(
        payload.user?.must_reset_password
          ? "/reset-password"
          : location.state?.from?.pathname ?? getDashboardPath(payload.user?.role),
        { replace: true },
      );
    } catch (error) {
      const statusCode = error?.response?.status;
      const message =
        statusCode === 403
          ? "Your account is disabled. Contact administrator."
          : statusCode
            ? error?.response?.data?.message ?? "Invalid credentials."
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
          <div className="relative mx-auto h-12 w-44">
            {!logoLoaded && (
              <div className="h-full w-full animate-pulse rounded bg-slate-200" />
            )}
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Institution logo"
                className={`mx-auto h-full object-contain ${logoLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity`}
                onLoad={() => setLogoLoaded(true)}
                onError={() => setLogoLoaded(true)}
              />
            )}
          </div>
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
            type={showPassword ? "text" : "password"}
            label="Password"
            placeholder="Enter your password"
            required
            error={errors.password?.message}
            rightIcon={
              showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )
            }
            onRightIconClick={() => setShowPassword((prev) => !prev)}
            {...register("password")}
          />

          {errors.root && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {errors.root.message}
            </div>
          )}
          <FormButton
            className="mt-4 w-full"
            type="submit"
            disabled={isLoading}
          >
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

import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";

import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AdminRoutes, StudentRoutes, TrainerRoutes } from "@/router";
import { ForbiddenPage } from "@/pages/app/ForbiddenPage";
import { RequireAuth } from "@/router/RequireAuth";
import { useAuthStore } from "@/store/authStore";

const LoginPage = lazy(() =>
  import("@/pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const ResetPasswordPage = lazy(() =>
  import("@/pages/auth/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })),
);

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
    </div>
  );
}

function App() {
  const role = useAuthStore((state) => state.user?.role);

  const roleRoutes =
    role === "admin"
      ? AdminRoutes()
      : role === "trainer"
        ? TrainerRoutes()
        : role === "student"
          ? StudentRoutes()
          : (
            <>
              <Route path="/forbidden" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<Navigate to="/forbidden" replace />} />
            </>
          );

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/forbidden" element={<ForbiddenPage />} />
            {roleRoutes}
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;

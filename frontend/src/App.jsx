import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router";

import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { AdminRoutes } from "@/router/routes/admin.routes";
import { TrainerRoutes } from "@/router/routes/trainer.routes";
import { StudentRoutes } from "@/router/routes/student.routes";
import { SharedRoutes } from "@/router/routes/shared.routes";
import { ForbiddenPage } from "@/pages/app/ForbiddenPage";
import { RequireAuth } from "@/router/RequireAuth";
import { useAuthStore } from "@/store/authStore";

const LoginPage = lazy(() =>
  import("@/pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);

const ROUTES_BY_ROLE = {
  admin: AdminRoutes,
  trainer: TrainerRoutes,
  student: StudentRoutes,
};

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
    </div>
  );
}

function App() {
  const role = useAuthStore((state) => state.user?.role);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            {SharedRoutes}
            {ROUTES_BY_ROLE[role]}
            <Route path="*" element={<ForbiddenPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;

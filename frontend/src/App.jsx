import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router";

import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { SharedRoutes } from "@/router/routes/shared.routes";
import { ForbiddenPage } from "@/pages/app/ForbiddenPage";
import { RequireAuth } from "@/router/RequireAuth";
import { useAuthStore } from "@/store/authStore";

const LoginPage = lazy(() =>
  import("@/pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);

const ROUTE_LOADERS_BY_ROLE = {
  admin: () => import("@/router/routes/admin.routes").then((module) => module.AdminRoutes),
  trainer: () => import("@/router/routes/trainer.routes").then((module) => module.TrainerRoutes),
  student: () => import("@/router/routes/student.routes").then((module) => module.StudentRoutes),
};

function useRoleRoutes(role) {
  const [loadedRoutes, setLoadedRoutes] = useState({ role: null, routes: null });

  useEffect(() => {
    const loadRoutes = ROUTE_LOADERS_BY_ROLE[role];
    if (!loadRoutes) return undefined;

    let active = true;
    loadRoutes().then((routes) => {
      if (active) setLoadedRoutes({ role, routes });
    });

    return () => {
      active = false;
    };
  }, [role]);

  return loadedRoutes.role === role ? loadedRoutes.routes : null;
}

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
    </div>
  );
}

function App() {
  const role = useAuthStore((state) => state.user?.role);
  const roleRoutes = useRoleRoutes(role);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            {SharedRoutes}
            {roleRoutes ? (
              <>
                {roleRoutes}
                <Route path="*" element={<ForbiddenPage />} />
              </>
            ) : (
              <Route path="*" element={<PageLoader />} />
            )}
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;

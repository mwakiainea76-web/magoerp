import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router";

import { AppLayout } from "@/layouts/AppLayout";
import { RequireAuth } from "@/router/RequireAuth";
import { useAuthStore } from "@/store/authStore";

const ForbiddenPage = lazy(() =>
  import("@/pages/app/ForbiddenPage").then((m) => ({ default: m.ForbiddenPage })),
);

function RouteLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
    </div>
  );
}

export function ProtectedAppRoutes() {
  const role = useAuthStore((state) => state.user?.role);
  const [roleRoutes, setRoleRoutes] = useState(null);

  useEffect(() => {
    let mounted = true;

    setRoleRoutes(null);

    async function loadRoleRoutes() {
      if (role === "admin") {
        const module = await import("@/router/adminRoutes");
        if (mounted) setRoleRoutes(() => module.AdminRoutes);
        return;
      }

      if (role === "trainer") {
        const module = await import("@/router/trainerRoutes");
        if (mounted) setRoleRoutes(() => module.TrainerRoutes);
        return;
      }

      if (role === "student") {
        const module = await import("@/router/studentRoutes");
        if (mounted) setRoleRoutes(() => module.StudentRoutes);
        return;
      }

      if (mounted) setRoleRoutes(() => null);
    }

    loadRoleRoutes();

    return () => {
      mounted = false;
    };
  }, [role]);

  const routesForRole = roleRoutes ? roleRoutes() : null;

  return (
    <Routes>
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/forbidden" element={<Suspense fallback={<RouteLoader />}><ForbiddenPage /></Suspense>} />
          {routesForRole ?? <Route path="*" element={<RouteLoader />} />}
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

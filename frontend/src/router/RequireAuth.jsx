import { Navigate, Outlet, useLocation } from "react-router";

import { useAuthStore } from "@/store/authStore";
import { getDashboardPath } from "@/support/dashboardPaths";

export function RequireAuth({ children }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user?.must_reset_password && location.pathname !== "/reset-password") {
    return <Navigate to="/reset-password" replace state={{ from: location }} />;
  }

  if (!user?.must_reset_password && location.pathname === "/reset-password") {
    return <Navigate to={getDashboardPath(user?.role)} replace />;
  }

  return children ?? <Outlet />;
}

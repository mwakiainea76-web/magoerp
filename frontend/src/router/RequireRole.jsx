import { Navigate, Outlet, useLocation } from "react-router";

import { useAuthStore } from "@/store/authStore";

export function RequireRole({ allowedRoles, children }) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!allowedRoles?.length) {
    return children ?? <Outlet />;
  }

  if (!allowedRoles.includes(user?.role)) {
    return <Navigate to="/forbidden" replace state={{ from: location }} />;
  }

  return children ?? <Outlet />;
}

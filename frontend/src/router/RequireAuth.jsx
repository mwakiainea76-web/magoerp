import { Navigate, Outlet, useLocation } from "react-router";

import { useAuthStore } from "@/store/authStore";

export function RequireAuth({ children }) {
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ?? <Outlet />;
}

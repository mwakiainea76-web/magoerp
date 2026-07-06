import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useAdminDashboardApi() {
  return useMemo(
    () => ({
      dashboard: async () => {
        const response = await authClient.get("/admin/dashboard");
        return response.data;
      },
    }),
    [],
  );
}

import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useFinanceDashboardApi() {
  return useMemo(
    () => ({
      overview: async (params = {}) => {
        const response = await authClient.get("/finance/dashboard", { params });
        return response.data;
      },
    }),
    [],
  );
}

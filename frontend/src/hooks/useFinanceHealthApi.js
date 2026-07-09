import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useFinanceHealthApi() {
  return useMemo(
    () => ({
      check: async () => {
        const response = await authClient.get("/finance/health");
        return response.data;
      },
      readiness: async (params = {}) => {
        const response = await authClient.get("/finance/readiness", { params });
        return response.data;
      },
    }),
    [],
  );
}

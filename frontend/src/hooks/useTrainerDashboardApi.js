import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useTrainerDashboardApi() {
  return useMemo(
    () => ({
      get: async () => {
        const response = await authClient.get("/trainer/dashboard");
        return response.data;
      },
    }),
    [],
  );
}

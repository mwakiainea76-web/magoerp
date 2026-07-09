import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useCohortBillingApi() {
  return useMemo(
    () => ({
      preview: async (payload) => {
        const response = await authClient.post("/cohort-billing/preview", payload);
        return response.data;
      },
      generate: async (payload) => {
        const response = await authClient.post("/cohort-billing/generate", payload);
        return response.data;
      },
    }),
    [],
  );
}

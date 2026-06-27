import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function usePaymentsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/payments", { params });
        return response.data;
      },
      store: async (payload) => {
        const response = await authClient.post("/payments", payload);
        return response.data;
      },
    }),
    [],
  );
}

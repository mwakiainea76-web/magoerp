import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useRefundsApi() {
  return useMemo(
    () => ({
      store: async (payload) => {
        const response = await authClient.post("/refunds", payload);
        return response.data;
      },
    }),
    [],
  );
}

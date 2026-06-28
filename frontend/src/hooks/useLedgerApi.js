import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useLedgerApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/ledger", { params });
        return response.data;
      },
    }),
    [],
  );
}

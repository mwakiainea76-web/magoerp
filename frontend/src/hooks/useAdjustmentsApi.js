import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useAdjustmentsApi() {
  return useMemo(
    () => ({
      store: async (invoiceId, payload) => {
        const response = await authClient.post(`/invoices/${invoiceId}/adjustments`, payload);
        return response.data;
      },
    }),
    [],
  );
}

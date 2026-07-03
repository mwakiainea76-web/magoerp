import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useInvoiceAdjustmentsApi() {
  return useMemo(
    () => ({
      store: async (payload) => {
        const response = await authClient.post("/invoice-adjustments", payload);
        return response.data;
      },
      storeCharge: async (payload) => {
        const response = await authClient.post("/invoice-charges", payload);
        return response.data;
      },
    }),
    [],
  );
}

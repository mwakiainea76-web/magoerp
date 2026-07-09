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
      reverse: async (paymentId, payload) => {
        const response = await authClient.post(`/payments/${paymentId}/reverse`, payload);
        return response.data;
      },
      reversalPreview: async (paymentId) => {
        const response = await authClient.get(`/payments/${paymentId}/reversal-preview`);
        return response.data;
      },
      fifoPreview: async (studentId, payload) => {
        const response = await authClient.post(`/students/${studentId}/payment-preview`, payload);
        return response.data;
      },
    }),
    [],
  );
}

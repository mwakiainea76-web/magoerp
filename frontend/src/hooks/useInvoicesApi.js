import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useInvoicesApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/invoices", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/invoices/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/invoices", payload);
        return response.data;
      },
      availableTemplates: async (studentId) => {
        const response = await authClient.get(`/students/${studentId}/fee-templates`);
        return response.data;
      },
    }),
    [],
  );
}

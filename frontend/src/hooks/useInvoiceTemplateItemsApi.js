import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useInvoiceTemplateItemsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/invoice-template-items", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/invoice-template-items/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/invoice-template-items", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/invoice-template-items/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/invoice-template-items/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

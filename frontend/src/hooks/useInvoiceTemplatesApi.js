import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useInvoiceTemplatesApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/invoice-templates", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/invoice-templates/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/invoice-templates", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/invoice-templates/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/invoice-templates/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

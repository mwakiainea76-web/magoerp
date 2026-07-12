import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useFeeTemplateItemsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/fee-template-items", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/fee-template-items/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/fee-template-items", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/fee-template-items/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/fee-template-items/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

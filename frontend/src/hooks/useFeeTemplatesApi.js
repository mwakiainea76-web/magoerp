import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useFeeTemplatesApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/fee-templates", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/fee-templates/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/fee-templates", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/fee-templates/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/fee-templates/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useFeeStructureItemsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/fee-structure-items", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/fee-structure-items/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/fee-structure-items", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/fee-structure-items/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/fee-structure-items/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

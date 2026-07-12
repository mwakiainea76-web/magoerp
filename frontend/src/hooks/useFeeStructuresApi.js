import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useFeeStructuresApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/fee-structures", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/fee-structures/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/fee-structures", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/fee-structures/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/fee-structures/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

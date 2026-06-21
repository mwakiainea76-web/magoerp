import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useFeePlanItemsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/fee-plan-items", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/fee-plan-items/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/fee-plan-items", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/fee-plan-items/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/fee-plan-items/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

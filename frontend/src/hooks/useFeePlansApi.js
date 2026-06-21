import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useFeePlansApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/fee-plans", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/fee-plans/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/fee-plans", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/fee-plans/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/fee-plans/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

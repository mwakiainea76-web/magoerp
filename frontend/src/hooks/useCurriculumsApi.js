import { useMemo } from "react";

import { authClient } from "@/lib/api/authClient";

export function useCurriculumsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/curricula", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/curricula/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/curricula", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/curricula/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/curricula/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

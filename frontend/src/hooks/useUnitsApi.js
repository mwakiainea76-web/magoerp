import { useMemo } from "react";

import { authClient } from "@/lib/api/authClient";

export function useUnitsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/units", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/units/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/units", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/units/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/units/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

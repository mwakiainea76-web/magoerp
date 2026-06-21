import { useMemo } from "react";

import { authClient } from "@/lib/api/authClient";

export function useAcademicSessionsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/academic-sessions", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/academic-sessions/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/academic-sessions", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/academic-sessions/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/academic-sessions/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

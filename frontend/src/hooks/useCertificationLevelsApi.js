import { useMemo } from "react";

import { authClient } from "@/lib/api/authClient";

export function useCertificationLevelsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/certification-levels", {
          params,
        });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/certification-levels/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/certification-levels", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/certification-levels/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/certification-levels/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

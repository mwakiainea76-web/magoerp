import { useMemo } from "react";

import { authClient } from "@/lib/api/authClient";

export function useCertificationAuthoritiesApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/certification-authorities", {
          params,
        });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/certification-authorities/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/certification-authorities", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/certification-authorities/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/certification-authorities/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

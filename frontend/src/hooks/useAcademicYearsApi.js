import { useMemo } from "react";

import { authClient } from "@/lib/api/authClient";

export function useAcademicYearsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/academic-years", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/academic-years/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/academic-years", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/academic-years/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/academic-years/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

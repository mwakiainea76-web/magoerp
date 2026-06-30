import { useMemo } from "react";

import { authClient } from "@/lib/api/authClient";

export function useDepartmentsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/departments", {
          params,
        });
        return response.data;
      },
      meta: async () => {
        const response = await authClient.get("/departments/meta");
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/departments/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/departments", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/departments/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/departments/${id}`);
        return response.data;
      },
      exportDepartments: async (params = {}) => {
        const response = await authClient.get("/departments/export", {
          params,
          responseType: "arraybuffer",
        });
        return response;
      },
    }),
    [],
  );
}

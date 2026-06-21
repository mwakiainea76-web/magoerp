import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useAccessRolesApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/access-roles", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/access-roles/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/access-roles", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/access-roles/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/access-roles/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

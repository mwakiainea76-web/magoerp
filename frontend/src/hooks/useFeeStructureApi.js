import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useFeeStructureApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/fee-structures", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/fee-structures/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/fee-structures", payload);
        return response.data;
      },
      clone: async (payload) => {
        const response = await authClient.post("/fee-structures/clone", payload);
        return response.data;
      },
      publish: async (id) => {
        const response = await authClient.post(`/fee-structures/${id}/publish`);
        return response.data;
      },
      archive: async (id) => {
        const response = await authClient.post(`/fee-structures/${id}/archive`);
        return response.data;
      },
      preview: async (payload) => {
        const response = await authClient.post("/fee-structures/preview", payload);
        return response.data;
      },
    }),
    [],
  );
}

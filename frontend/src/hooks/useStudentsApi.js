import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useStudentsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/students", { params });
        return response.data;
      },
      meta: async () => {
        const response = await authClient.get("/students/meta");
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/students/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/students", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/students/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/students/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

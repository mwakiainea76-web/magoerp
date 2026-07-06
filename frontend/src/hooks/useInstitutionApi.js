import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useInstitutionApi() {
  return useMemo(
    () => ({
      active: async () => {
        const response = await authClient.get("/institution/active");
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/institutions/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/institutions", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/institutions/${id}`, payload);
        return response.data;
      },
    }),
    [],
  );
}

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
      save: async (payload, id = null) => {
        const formData = new FormData();
        for (const [key, value] of Object.entries(payload)) {
          formData.append(key, value ?? "");
        }
        if (id) {
          formData.append("_method", "PUT");
        }
        const url = id ? `/institutions/${id}` : "/institutions";
        const response = await authClient.post(url, formData, {
          headers: { "Content-Type": null },
        });
        return response.data;
      },
    }),
    [],
  );
}

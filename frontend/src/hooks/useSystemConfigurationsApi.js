import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useSystemConfigurationsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/system-configurations", { params });
        return response.data;
      },
      update: async (key, payload) => {
        const response = await authClient.put(`/system-configurations/${key}`, payload);
        return response.data;
      },
    }),
    [],
  );
}

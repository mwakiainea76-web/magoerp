import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useApiMonitoring() {
  return useMemo(() => ({
    listErrors: async (params = {}) => {
      const response = await authClient.get("/monitoring/logs", { params });
      return response.data;
    },

    getStats: async () => {
      const response = await authClient.get("/monitoring/logs/stats");
      return response.data;
    },

    showError: async (id) => {
      const response = await authClient.get(`/monitoring/logs/${id}`);
      return response.data;
    },

    escalate: async (id, payload) => {
      const response = await authClient.post(`/monitoring/logs/${id}/escalate`, payload);
      return response.data;
    },

    resolve: async (id) => {
      const response = await authClient.post(`/monitoring/logs/${id}/resolve`);
      return response.data;
    },
  }), []);
}

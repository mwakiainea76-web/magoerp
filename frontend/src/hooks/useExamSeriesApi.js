import { useMemo } from "react";

import { authClient } from "@/lib/api/authClient";

export function useExamSeriesApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/exam-series", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/exam-series/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/exam-series", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/exam-series/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/exam-series/${id}`);
        return response.data;
      },
      options: async () => {
        const response = await authClient.get("/exam-series/options");
        return response.data;
      },
      availableSessions: async () => {
        const response = await authClient.get("/exam-series/available-sessions");
        return response.data;
      },
    }),
    [],
  );
}

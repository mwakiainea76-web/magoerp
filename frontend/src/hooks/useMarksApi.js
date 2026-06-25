import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useMarksApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/marks", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/marks/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/marks", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/marks/${id}`, payload);
        return response.data;
      },
      bulkStore: async (payload) => {
        const response = await authClient.post("/marks/bulk", payload);
        return response.data;
      },
      togglePublish: async (id) => {
        const response = await authClient.post(`/marks/${id}/toggle-publish`);
        return response.data;
      },
      publishAssessment: async (payload) => {
        const response = await authClient.post("/marks/publish-assessment", payload);
        return response.data;
      },
      availableUnits: async (params = {}) => {
        const response = await authClient.get("/marks/available-units", { params });
        return response.data;
      },
      availableStudents: async (params = {}) => {
        const response = await authClient.get("/marks/available-students", { params });
        return response.data;
      },
      marksheet: async (params = {}) => {
        const response = await authClient.get("/marks/marksheet", { params });
        return response.data;
      },
      myResults: async (params = {}) => {
        const response = await authClient.get("/my/results", { params });
        return response.data;
      },
      myResultsSessions: async (params = {}) => {
        const response = await authClient.get("/my/results-sessions", { params });
        return response.data;
      },
    }),
    [],
  );
}

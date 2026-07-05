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
      publishFiltered: async (payload) => {
        const response = await authClient.post("/marks/publish-filtered", payload);
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
      exportMarks: async (params = {}) => {
        try {
          return await authClient.get("/marks/export", {
            params,
            responseType: "blob",
            timeout: 0,
          });
        } catch (error) {
          if (error.response?.data instanceof Blob && error.response.data.type?.includes("application/json")) {
            error.response.data = JSON.parse(await error.response.data.text());
          }

          throw error;
        }
      },
      myMarksheet: async (params = {}) => {
        const response = await authClient.get("/my/marksheet", { params });
        return response.data;
      },
      myTranscript: async (params = {}) => {
        const response = await authClient.get("/my/transcript", { params });
        return response.data;
      },
      myTranscriptDownload: async (params = {}) => {
        try {
          return await authClient.get("/my/transcript/download", {
            params,
            responseType: "blob",
            timeout: 0,
          });
        } catch (error) {
          if (error.response?.data instanceof Blob && error.response.data.type?.includes("application/json")) {
            error.response.data = JSON.parse(await error.response.data.text());
          }

          throw error;
        }
      },
      myResults: async (params = {}) => {
        const response = await authClient.get("/my/results", { params });
        return response.data;
      },
      myResultsSessions: async (params = {}) => {
        const response = await authClient.get("/my/results-sessions", { params });
        return response.data;
      },
      mySessionEnrolments: async (params = {}) => {
        const response = await authClient.get("/my/session-enrolments", { params });
        return response.data;
      },
      adminMarksheet: async (params = {}) => {
        const response = await authClient.get("/marks/student-marksheet", { params });
        return response.data;
      },
      adminTranscriptEnrolments: async (params = {}) => {
        const response = await authClient.get("/marks/transcript/enrolments", { params });
        return response.data;
      },
      adminTranscript: async (params = {}) => {
        const response = await authClient.get("/marks/transcript", { params });
        return response.data;
      },
      adminTranscriptDownload: async (params = {}) => {
        try {
          return await authClient.get("/marks/transcript/download", {
            params,
            responseType: "blob",
            timeout: 0,
          });
        } catch (error) {
          if (error.response?.data instanceof Blob && error.response.data.type?.includes("application/json")) {
            error.response.data = JSON.parse(await error.response.text());
          }
          throw error;
        }
      },
    }),
    [],
  );
}

import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useCourseEnrolmentsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/course-enrolments", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/course-enrolments/${id}`);
        return response.data;
      },
      updateStatus: async (id, payload) => {
        const response = await authClient.put(`/course-enrolments/${id}/status`, payload);
        return response.data;
      },
      statusLogs: async (params = {}) => {
        const response = await authClient.get("/student-status-logs", { params });
        return response.data;
      },
    }),
    [],
  );
}

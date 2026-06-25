import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useAcademicSessionEnrolmentsApi() {
  return useMemo(
    () => ({
      myEnrolments: async () => {
        const response = await authClient.get("/my/session-enrolments");
        return response.data;
      },
      availableSessions: async () => {
        const response = await authClient.get("/my/available-sessions");
        return response.data;
      },
      enroll: async (academicSessionId) => {
        const response = await authClient.post("/academic-session-enrolments", {
          academic_session_id: academicSessionId,
        });
        return response.data;
      },
      list: async (params = {}) => {
        const response = await authClient.get("/academic-session-enrolments", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/academic-session-enrolments/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

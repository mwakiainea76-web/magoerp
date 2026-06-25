import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useStudentDashboardApi() {
  return useMemo(
    () => ({
      dashboard: async () => {
        const response = await authClient.get("/student/dashboard");
        return response.data;
      },
      registerSession: async () => {
        const response = await authClient.post("/student/register-session");
        return response.data;
      },
    }),
    [],
  );
}

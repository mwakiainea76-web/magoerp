import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useStudentAccountApi() {
  return useMemo(
    () => ({
      search: async (params = {}) => {
        const response = await authClient.get("/student-accounts/search", { params });
        return response.data;
      },
      overview: async (studentId) => {
        const response = await authClient.get(`/student-accounts/${studentId}`);
        return response.data;
      },
    }),
    [],
  );
}

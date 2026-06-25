import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useCourseChangeApi() {
  return useMemo(
    () => ({
      lookupStudent: async (admissionNumber) => {
        const response = await authClient.post("/course-change/lookup", {
          admission_number: admissionNumber,
        });
        return response.data;
      },
      availableMappings: async (studentId) => {
        const response = await authClient.post("/course-change/available-mappings", {
          student_id: studentId,
        });
        return response.data;
      },
      transfer: async (payload) => {
        const response = await authClient.post("/course-change/transfer", payload);
        return response.data;
      },
      history: async (studentId) => {
        const response = await authClient.post("/course-change/history", {
          student_id: studentId,
        });
        return response.data;
      },
      allTransfers: async (params = {}) => {
        const response = await authClient.get("/course-change/transfers", { params });
        return response.data;
      },
    }),
    [],
  );
}

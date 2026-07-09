import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useStudentsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/students", { params });
        return response.data;
      },
      meta: async (params = {}) => {
        const response = await authClient.get("/students/meta", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/students/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/students", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/students/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/students/${id}`);
        return response.data;
      },
      admissionLetter: async (id) => {
        const response = await authClient.get(`/students/${id}/admission-letter`);
        return response.data;
      },
      resetPassword: async (admissionNumber) => {
        const response = await authClient.post("/admin/reset-student-password", { admission_number: admissionNumber });
        return response.data;
      },
      exportStudents: async (params = {}) => {
        try {
          return await authClient.get("/students/export", {
            params,
            responseType: "blob",
            timeout: 0,
          });
        } catch (error) {
          if (error.response?.data instanceof Blob) {
            const contentType = error.response.data.type ?? "";

            if (contentType.includes("application/json")) {
              error.response.data = JSON.parse(await error.response.data.text());
            }
          }

          throw error;
        }
      },
    }),
    [],
  );
}

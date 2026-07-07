import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useCourseCurriculaApi() {
  return useMemo(
    () => ({
      search: async (params = {}) => {
        const response = await authClient.get("/course-curricula/search", { params });
        return response.data;
      },
      list: async (params = {}) => {
        const response = await authClient.get("/course-curricula", { params });
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/course-curricula", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/course-curricula/${id}`, payload);
        return response.data;
      },
      destroy: async (id) => {
        const response = await authClient.delete(`/course-curricula/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

import { useMemo } from "react";

import { authClient } from "@/lib/api/authClient";

export function useCoursesApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/courses", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/courses/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/courses", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/courses/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/courses/${id}`);
        return response.data;
      },
      attachCurriculum: async (courseId, curriculumId) => {
        const response = await authClient.post(`/courses/${courseId}/curricula`, { curriculum_id: curriculumId });
        return response.data;
      },
      detachCurriculum: async (courseId, curriculumId) => {
        const response = await authClient.delete(`/courses/${courseId}/curricula`, { data: { curriculum_id: curriculumId } });
        return response.data;
      },
      toggleCurriculum: async (courseId, curriculumId) => {
        const response = await authClient.patch(`/courses/${courseId}/curricula/toggle`, { curriculum_id: curriculumId });
        return response.data;
      },
      exportCourses: async (params = {}) => {
        return await authClient.get("/courses/export", { params, responseType: "blob", timeout: 0 });
      },
    }),
    [],
  );
}

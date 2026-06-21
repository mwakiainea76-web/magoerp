import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useFeePlanCourseAssignmentsApi() {
  return useMemo(
    () => ({
      list: async (feePlanId) => {
        const response = await authClient.get(`/fee-plans/${feePlanId}/course-assignments`);
        return response.data;
      },
      create: async (feePlanId, payload) => {
        const response = await authClient.post(`/fee-plans/${feePlanId}/course-assignments`, payload);
        return response.data;
      },
      update: async (feePlanId, itemId, payload) => {
        const response = await authClient.put(`/fee-plans/${feePlanId}/course-assignments/${itemId}`, payload);
        return response.data;
      },
      remove: async (feePlanId, itemId) => {
        const response = await authClient.delete(`/fee-plans/${feePlanId}/course-assignments/${itemId}`);
        return response.data;
      },
    }),
    [],
  );
}

import { useMemo } from "react";

import { authClient } from "@/lib/api/authClient";

export function useCertificationAuthorityGradesApi(authorityId) {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get(`/certification-authorities/${authorityId}/grades`, { params });
        return response.data;
      },
      show: async (gradeId) => {
        const response = await authClient.get(`/certification-authorities/${authorityId}/grades/${gradeId}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post(`/certification-authorities/${authorityId}/grades`, payload);
        return response.data;
      },
      update: async (gradeId, payload) => {
        const response = await authClient.put(`/certification-authorities/${authorityId}/grades/${gradeId}`, payload);
        return response.data;
      },
      remove: async (gradeId) => {
        const response = await authClient.delete(`/certification-authorities/${authorityId}/grades/${gradeId}`);
        return response.data;
      },
    }),
    [authorityId],
  );
}

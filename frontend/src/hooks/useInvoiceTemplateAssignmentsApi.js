import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useInvoiceTemplateAssignmentsApi() {
  return useMemo(
    () => ({
      list: async (templateId) => {
        const response = await authClient.get(`/invoice-templates/${templateId}/course-assignments`);
        return response.data;
      },
      create: async (templateId, payload) => {
        const response = await authClient.post(`/invoice-templates/${templateId}/course-assignments`, payload);
        return response.data;
      },
      update: async (templateId, itemId, payload) => {
        const response = await authClient.put(`/invoice-templates/${templateId}/course-assignments/${itemId}`, payload);
        return response.data;
      },
      remove: async (templateId, itemId) => {
        const response = await authClient.delete(`/invoice-templates/${templateId}/course-assignments/${itemId}`);
        return response.data;
      },
    }),
    [],
  );
}

import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useComplaintsApi() {
  return useMemo(
    () => ({
      myComplaints: async (params = {}) => {
        const response = await authClient.get("/my/complaints", { params });
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/complaints", payload);
        return response.data;
      },
      adminIndex: async (params = {}) => {
        const response = await authClient.get("/complaints", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/complaints/${id}`);
        return response.data;
      },
      escalate: async (id, payload) => {
        const response = await authClient.post(`/complaints/${id}/escalate`, payload);
        return response.data;
      },
      resolve: async (id, payload = {}) => {
        const response = await authClient.post(`/complaints/${id}/resolve`, payload);
        return response.data;
      },
      review: async (id, payload = {}) => {
        const response = await authClient.post(`/complaints/${id}/review`, payload);
        return response.data;
      },
      staffList: async () => {
        const response = await authClient.get("/complaints/staff-list");
        return response.data;
      },
    }),
    [],
  );
}

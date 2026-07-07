import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useHostelRoomsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/hostel-rooms", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/hostel-rooms/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/hostel-rooms", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/hostel-rooms/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/hostel-rooms/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

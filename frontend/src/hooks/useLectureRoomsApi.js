import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useLectureRoomsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/lecture-rooms", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/lecture-rooms/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/lecture-rooms", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/lecture-rooms/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/lecture-rooms/${id}`);
        return response.data;
      },
    }),
    [],
  );
}

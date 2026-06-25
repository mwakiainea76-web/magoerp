import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useTimetableApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/timetables", { params });
        return response.data;
      },
      weekGrid: async (params = {}) => {
        const response = await authClient.get("/timetables/week-grid", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/timetables/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/timetables", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/timetables/${id}`, payload);
        return response.data;
      },
      destroy: async (id) => {
        const response = await authClient.delete(`/timetables/${id}`);
        return response.data;
      },
      myTimetable: async (params = {}) => {
        const response = await authClient.get("/my/timetable", { params });
        return response.data;
      },
      availableUnits: async (params = {}) => {
        const response = await authClient.get("/timetables/available-units", { params });
        return response.data;
      },
      staffList: async (params = {}) => {
        const response = await authClient.get("/timetables/staff-list", { params });
        return response.data;
      },
      lectureRooms: async (params = {}) => {
        const response = await authClient.get("/lecture-rooms", { params: { ...params, all: true } });
        return response.data;
      },
      createRoom: async (payload) => {
        const response = await authClient.post("/lecture-rooms", payload);
        return response.data;
      },
    }),
    [],
  );
}

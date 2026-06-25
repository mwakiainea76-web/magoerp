import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useHostelsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/hostels", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/hostels/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/hostels", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/hostels/${id}`, payload);
        return response.data;
      },
      destroy: async (id) => {
        const response = await authClient.delete(`/hostels/${id}`);
        return response.data;
      },
      roomsByHostel: async (hostelId) => {
        const response = await authClient.get(`/hostels/${hostelId}/rooms`);
        return response.data;
      },
      bedsByRoom: async (roomId) => {
        const response = await authClient.get(`/hostel-rooms/${roomId}/beds`);
        return response.data;
      },
      storeRoom: async (payload) => {
        const response = await authClient.post("/hostel-rooms", payload);
        return response.data;
      },
      updateRoom: async (roomId, payload) => {
        const response = await authClient.put(`/hostel-rooms/${roomId}`, payload);
        return response.data;
      },
      allocations: async (params = {}) => {
        const response = await authClient.get("/hostel-allocations", { params });
        return response.data;
      },
      storeAllocation: async (payload) => {
        const response = await authClient.post("/hostel-allocations", payload);
        return response.data;
      },
      vacateAllocation: async (id) => {
        const response = await authClient.post(`/hostel-allocations/${id}/vacate`);
        return response.data;
      },
      myAllocation: async () => {
        const response = await authClient.get("/my/hostel-allocation");
        return response.data;
      },
      availableHostels: async () => {
        const response = await authClient.get("/my/available-hostels");
        return response.data;
      },
      bookingEligibility: async () => {
        const response = await authClient.get("/my/hostel-booking/eligibility");
        return response.data;
      },
      selfBook: async (payload) => {
        const response = await authClient.post("/my/hostel-booking", payload);
        return response.data;
      },
    }),
    [],
  );
}

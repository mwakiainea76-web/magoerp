import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useSecurityApi() {
  return useMemo(() => ({
    getDashboard: async () => {
      const response = await authClient.get("/security/dashboard");
      return response.data;
    },

    listEvents: async (params = {}) => {
      const response = await authClient.get("/security/events", { params });
      return response.data;
    },

    showEvent: async (id) => {
      const response = await authClient.get(`/security/events/${id}`);
      return response.data;
    },

    resolveEvent: async (id) => {
      const response = await authClient.post(`/security/events/${id}/resolve`);
      return response.data;
    },

    listDevices: async (params = {}) => {
      const response = await authClient.get("/security/devices", { params });
      return response.data;
    },

    showDevice: async (id) => {
      const response = await authClient.get(`/security/devices/${id}`);
      return response.data;
    },

    deleteDevice: async (id) => {
      const response = await authClient.delete(`/security/devices/${id}`);
      return response.data;
    },

    listSessions: async (params = {}) => {
      const response = await authClient.get("/security/sessions", { params });
      return response.data;
    },

    showSession: async (id) => {
      const response = await authClient.get(`/security/sessions/${id}`);
      return response.data;
    },

    terminateSession: async (id) => {
      const response = await authClient.delete(`/security/sessions/${id}`);
      return response.data;
    },

    terminateOtherSessions: async (userId) => {
      const response = await authClient.delete("/security/sessions/others", { data: { user_id: userId } });
      return response.data;
    },

    listBlockedIps: async (params = {}) => {
      const response = await authClient.get("/security/blocked/ips", { params });
      return response.data;
    },

    blockIp: async (payload) => {
      const response = await authClient.post("/security/blocked/ips", payload);
      return response.data;
    },

    unblockIp: async (id) => {
      const response = await authClient.delete(`/security/blocked/ips/${id}`);
      return response.data;
    },

    listBlockedDevices: async (params = {}) => {
      const response = await authClient.get("/security/blocked/devices", { params });
      return response.data;
    },

    blockDevice: async (payload) => {
      const response = await authClient.post("/security/blocked/devices", payload);
      return response.data;
    },

    unblockDevice: async (id) => {
      const response = await authClient.delete(`/security/blocked/devices/${id}`);
      return response.data;
    },

    listBlockedUsers: async (params = {}) => {
      const response = await authClient.get("/security/blocked/users", { params });
      return response.data;
    },

    blockUser: async (payload) => {
      const response = await authClient.post("/security/blocked/users", payload);
      return response.data;
    },

    unblockUser: async (id) => {
      const response = await authClient.delete(`/security/blocked/users/${id}`);
      return response.data;
    },

    showUserProfile: async (userId) => {
      const response = await authClient.get(`/security/users/${userId}`);
      return response.data;
    },

    trustDevice: async (userId, deviceId) => {
      const response = await authClient.post(`/security/users/${userId}/trust-device`, { device_id: deviceId });
      return response.data;
    },
  }), []);
}

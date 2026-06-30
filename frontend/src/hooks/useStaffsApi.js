import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useStaffsApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/staffs", { params });
        return response.data;
      },
      meta: async () => {
        const response = await authClient.get("/staffs/meta");
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/staffs/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/staffs", payload);
        return response.data;
      },
      update: async (id, payload) => {
        const response = await authClient.put(`/staffs/${id}`, payload);
        return response.data;
      },
      remove: async (id) => {
        const response = await authClient.delete(`/staffs/${id}`);
        return response.data;
      },
      exportStaffs: async (params = {}) => {
        const response = await authClient.get("/staffs/export", {
          params,
          responseType: "arraybuffer",
        });
        return response;
      },
    }),
    [],
  );
}

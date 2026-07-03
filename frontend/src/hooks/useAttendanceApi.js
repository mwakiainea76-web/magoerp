import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useAttendanceApi() {
  return useMemo(
    () => ({
      assignedUnits: async () => {
        const response = await authClient.get("/attendance/assigned-units");
        return response.data;
      },
      roster: async (params) => {
        const response = await authClient.get("/attendance/roster", { params });
        return response.data;
      },
      mark: async (payload) => {
        const response = await authClient.post("/attendance/mark", payload);
        return response.data;
      },
    }),
    [],
  );
}
import { useMemo } from "react";

import { authClient } from "@/lib/api/authClient";

export function useAuthApi() {
  return useMemo(
    () => ({
      login: async ({ loginId, password }) => {
        const response = await authClient.post("/login", {
          login_id: loginId,
          password,
        });

        return response.data;
      },
      logout: async () => {
        const response = await authClient.post("/logout");

        return response.data;
      },
      me: async () => {
        const response = await authClient.get("/me");

        return response.data;
      },
    }),
    [],
  );
}

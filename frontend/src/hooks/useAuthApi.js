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
      verifyOtp: async ({ temporaryToken, otp }) => {
        const response = await authClient.post("/login/verify-otp", {
          temporary_token: temporaryToken,
          otp,
        });
        return response.data;
      },
      resendOtp: async ({ temporaryToken }) => {
        const response = await authClient.post("/login/resend-otp", {
          temporary_token: temporaryToken,
        });
        return response.data;
      },
      changePassword: async ({ currentPassword, password, passwordConfirmation }) => {
        const response = await authClient.post("/change-password", {
          current_password: currentPassword,
          password,
          password_confirmation: passwordConfirmation,
        });

        return response.data;
      },
    }),
    [],
  );
}

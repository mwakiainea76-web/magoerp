import { lazy } from "react";
import { Route } from "react-router";

import { ForbiddenPage } from "@/pages/app/ForbiddenPage";

const ResetPasswordPage = lazy(() =>
  import("@/pages/auth/ResetPasswordPage").then((m) => ({ default: m.ResetPasswordPage })),
);

export const SharedRoutes = (
  <>
    <Route path="/reset-password" element={<ResetPasswordPage />} />
    <Route path="/forbidden" element={<ForbiddenPage />} />
  </>
);

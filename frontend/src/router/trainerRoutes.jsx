import { Route } from "react-router";

import { TrainerDashboard } from "@/pages/trainer/TrainerDashboard";

export function TrainerRoutes() {
  return (
    <>
      <Route path="/dashboard" element={<TrainerDashboard />} />
    </>
  );
}

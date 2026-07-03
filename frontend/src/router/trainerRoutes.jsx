import { Route } from "react-router";

import { TrainerDashboard } from "@/pages/trainer/TrainerDashboard";
import { AttendanceIndexPage } from "@/pages/attendance/AttendanceIndexPage";
import { AttendanceMarkPage } from "@/pages/attendance/AttendanceMarkPage";

export function TrainerRoutes() {
  return (
    <>
      <Route path="/dashboard" element={<TrainerDashboard />} />
      <Route path="/attendance" element={<AttendanceIndexPage />} />
      <Route path="/attendance/mark" element={<AttendanceMarkPage />} />
    </>
  );
}

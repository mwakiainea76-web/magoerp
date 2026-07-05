import { Route } from "react-router";

import { TrainerDashboard } from "@/pages/trainer/TrainerDashboard";
import { AttendanceIndexPage } from "@/pages/attendance/AttendanceIndexPage";
import { AttendanceMarkPage } from "@/pages/attendance/AttendanceMarkPage";

export const TrainerRoutes = (
  <>
    <Route path="/trainer/dashboard" element={<TrainerDashboard />} />
    <Route path="/trainer/attendance" element={<AttendanceIndexPage />} />
    <Route path="/trainer/attendance/mark" element={<AttendanceMarkPage />} />
  </>
);

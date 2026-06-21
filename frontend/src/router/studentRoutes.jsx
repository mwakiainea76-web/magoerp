import { Route } from "react-router";

import { StudentDashboard } from "@/pages/student/StudentDashboard";

export function StudentRoutes() {
  return (
    <>
      <Route path="/dashboard" element={<StudentDashboard />} />
    </>
  );
}

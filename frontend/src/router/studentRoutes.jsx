import { Route } from "react-router";

import { StudentDashboard } from "@/pages/student/StudentDashboard";
import { StudentLandingPage } from "@/pages/student/StudentLandingPage";

export function StudentRoutes() {
  return (
    <>
      <Route path="/" element={<StudentLandingPage />} />
      <Route path="/dashboard" element={<StudentDashboard />} />
    </>
  );
}

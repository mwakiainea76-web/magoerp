/* eslint-disable react-refresh/only-export-components */
import { lazy } from "react";
import { Route } from "react-router";

const TrainerDashboard = lazy(() => import("@/pages/trainer/TrainerDashboard").then((module) => ({ default: module.TrainerDashboard })));
const AttendanceIndexPage = lazy(() => import("@/pages/attendance/AttendanceIndexPage").then((module) => ({ default: module.AttendanceIndexPage })));
const AttendanceMarkPage = lazy(() => import("@/pages/attendance/AttendanceMarkPage").then((module) => ({ default: module.AttendanceMarkPage })));

export const TrainerRoutes = (
  <>
    <Route path="/trainer/dashboard" element={<TrainerDashboard />} />
    <Route path="/trainer/attendance" element={<AttendanceIndexPage />} />
    <Route path="/trainer/attendance/mark" element={<AttendanceMarkPage />} />
  </>
);

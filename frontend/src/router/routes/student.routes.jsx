/* eslint-disable react-refresh/only-export-components */
import { lazy } from "react";
import { Route } from "react-router";

const StudentDashboard = lazy(() => import("@/pages/student/StudentDashboard").then((module) => ({ default: module.StudentDashboard })));
const MarksheetPage = lazy(() => import("@/pages/grades/MarksheetPage").then((module) => ({ default: module.MarksheetPage })));
const TranscriptPage = lazy(() => import("@/pages/grades/TranscriptPage").then((module) => ({ default: module.TranscriptPage })));
const TimetablePage = lazy(() => import("@/pages/timetables/TimetablePage").then((module) => ({ default: module.TimetablePage })));
const MyUnitsPage = lazy(() => import("@/pages/units/MyUnitsPage").then((module) => ({ default: module.MyUnitsPage })));
const CreateSupportRequestPage = lazy(() => import("@/pages/support-requests/CreateSupportRequestPage").then((module) => ({ default: module.CreateSupportRequestPage })));
const MySupportRequestsPage = lazy(() => import("@/pages/support-requests/MySupportRequestsPage").then((module) => ({ default: module.MySupportRequestsPage })));
const MyHostelPage = lazy(() => import("@/pages/hostels/MyHostelPage").then((module) => ({ default: module.MyHostelPage })));
const StudentFeeStatementPage = lazy(() => import("@/pages/finance/student-accounts/StudentFeeStatementPage").then((module) => ({ default: module.StudentFeeStatementPage })));

export const StudentRoutes = (
  <>
    <Route path="/student" element={<StudentDashboard />} />
    <Route path="/student/dashboard" element={<StudentDashboard />} />
    <Route path="/student/assessments/marksheet" element={<MarksheetPage role="student" />} />
    <Route path="/student/assessments/transcript" element={<TranscriptPage role="student" />} />
    <Route path="/student/assessments" element={<MarksheetPage role="student" />} />
    <Route path="/student/timetables" element={<TimetablePage role="student" />} />
    <Route path="/student/my-units" element={<MyUnitsPage />} />
    <Route path="/student/support-requests" element={<MySupportRequestsPage />} />
    <Route path="/student/support-requests/create" element={<CreateSupportRequestPage />} />
    <Route path="/student/hostel" element={<MyHostelPage />} />
    <Route path="/student/finance/statements" element={<StudentFeeStatementPage role="student" />} />
    <Route path="/student/finance/statement" element={<StudentFeeStatementPage role="student" />} />
  </>
);

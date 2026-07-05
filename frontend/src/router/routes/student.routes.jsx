import { Route } from "react-router";

import { StudentDashboard } from "@/pages/student/StudentDashboard";
import { MarksheetPage } from "@/pages/grades/MarksheetPage";
import { TranscriptPage } from "@/pages/grades/TranscriptPage";
import { TimetablePage } from "@/pages/timetables/TimetablePage";
import { MyUnitsPage } from "@/pages/units/MyUnitsPage";
import { CreateSupportRequestPage } from "@/pages/support-requests/CreateSupportRequestPage";
import { MySupportRequestsPage } from "@/pages/support-requests/MySupportRequestsPage";
import { MyHostelPage } from "@/pages/hostels/MyHostelPage";
import { StudentHostelBookingPage } from "@/pages/hostels/StudentHostelBookingPage";
import { StudentFeeStatementPage } from "@/pages/finance/StudentFeeStatementPage";

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
    <Route path="/student/hostel-book" element={<StudentHostelBookingPage />} />
    <Route path="/student/finance/statements" element={<StudentFeeStatementPage role="student" />} />
    <Route path="/student/finance/statement" element={<StudentFeeStatementPage role="student" />} />
  </>
);

import { Route } from "react-router";

import { StudentDashboard } from "@/pages/student/StudentDashboard";
import { MarksheetPage } from "@/pages/grades/MarksheetPage";
import { TranscriptPage } from "@/pages/grades/TranscriptPage";
import { MyTimetablePage } from "@/pages/timetables/MyTimetablePage";
import { CreateSupportRequestPage } from "@/pages/support-requests/CreateSupportRequestPage";
import { MySupportRequestsPage } from "@/pages/support-requests/MySupportRequestsPage";
import { MyHostelPage } from "@/pages/hostels/MyHostelPage";
import { StudentHostelBookingPage } from "@/pages/hostels/StudentHostelBookingPage";
import { StudentFeeStatementPage } from "@/pages/finance/StudentFeeStatementPage";
import { MyUnitsPage } from "@/pages/units/MyUnitsPage";

export function StudentRoutes() {
  return (
    <>
      <Route path="/" element={<StudentDashboard />} />
      <Route path="/assessments/marksheet" element={<MarksheetPage selfService />} />
      <Route path="/assessments/transcript" element={<TranscriptPage selfService />} />
      <Route path="/assessments" element={<MarksheetPage selfService />} />
      <Route path="/timetables" element={<MyTimetablePage />} />
      <Route path="/my-units" element={<MyUnitsPage />} />
      <Route path="/support-requests" element={<MySupportRequestsPage />} />
      <Route path="/support-requests/create" element={<CreateSupportRequestPage />} />
      <Route path="/hostel" element={<MyHostelPage />} />
      <Route path="/hostel-book" element={<StudentHostelBookingPage />} />
      <Route path="/finance/statements" element={<StudentFeeStatementPage selfService />} />
      <Route path="/finance/statement" element={<StudentFeeStatementPage selfService />} />
    </>
  );
}

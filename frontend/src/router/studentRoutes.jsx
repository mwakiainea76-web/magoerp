import { Route } from "react-router";

import { StudentDashboard } from "@/pages/student/StudentDashboard";
import { MyResultsPage } from "@/pages/grades/MyResultsPage";
import { MyTimetablePage } from "@/pages/timetables/MyTimetablePage";
import { CreateComplaintPage } from "@/pages/complaints/CreateComplaintPage";
import { MyComplaintsPage } from "@/pages/complaints/MyComplaintsPage";
import { MyHostelPage } from "@/pages/hostels/MyHostelPage";
import { StudentHostelBookingPage } from "@/pages/hostels/StudentHostelBookingPage";
import { StudentStatementPage } from "@/pages/finance/StudentStatementPage";

export function StudentRoutes() {
  return (
    <>
      <Route path="/" element={<StudentDashboard />} />
      <Route path="/assessments" element={<MyResultsPage />} />
      <Route path="/timetables" element={<MyTimetablePage />} />
      <Route path="/complaints" element={<MyComplaintsPage />} />
      <Route path="/complaints/create" element={<CreateComplaintPage />} />
      <Route path="/hostel" element={<MyHostelPage />} />
      <Route path="/hostel-book" element={<StudentHostelBookingPage />} />
      <Route path="/finance/statements" element={<StudentStatementPage selfService />} />
      <Route path="/finance/statement" element={<StudentStatementPage selfService />} />
    </>
  );
}

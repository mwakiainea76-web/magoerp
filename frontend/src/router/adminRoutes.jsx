import { Route } from "react-router";

import { AccessRoleFormPage } from "@/pages/access/AccessRoleFormPage";
import { CalendarPage } from "@/pages/calendar/CalendarPage";
import { StudentStatusLogsPage } from "@/pages/enrolments/StudentStatusLogsPage";
import { SystemConfigurationsPage } from "@/pages/admin/SystemConfigurationsPage";
import { AccessRolePermissionsPage } from "@/pages/access/AccessRolePermissionsPage";
import { AccessRolesPage } from "@/pages/access/AccessRolesPage";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AcademicSessionFormPage } from "@/pages/academicCalendar/AcademicSessionFormPage";
import { AcademicSessionsPage } from "@/pages/academicCalendar/AcademicSessionsPage";
import { AcademicYearFormPage } from "@/pages/academicCalendar/AcademicYearFormPage";
import { SessionEnrolmentsPage } from "@/pages/academicCalendar/SessionEnrolmentsPage";
import { AcademicYearsPage } from "@/pages/academicCalendar/AcademicYearsPage";
import { AttendanceIndexPage } from "@/pages/attendance/AttendanceIndexPage";
import { AttendanceMarkPage } from "@/pages/attendance/AttendanceMarkPage";
import { CertificationAuthoritiesPage } from "@/pages/certificationAuthorities/CertificationAuthoritiesPage";
import { CertificationAuthorityFormPage } from "@/pages/certificationAuthorities/CertificationAuthorityFormPage";
import { CertificationLevelFormPage } from "@/pages/certificationAuthorities/CertificationLevelFormPage";
import { CertificationLevelsPage } from "@/pages/certificationAuthorities/CertificationLevelsPage";
import { CourseFormPage } from "@/pages/courses/CourseFormPage";
import { CourseEnrolmentsPage } from "@/pages/courses/CourseEnrolmentsPage";
import { CoursesPage } from "@/pages/courses/CoursesPage";
import { CurriculumFormPage } from "@/pages/curriculums/CurriculumFormPage";
import { CurriculumMappingsPage } from "@/pages/curriculums/CurriculumMappingsPage";
import { CurriculumsPage } from "@/pages/curriculums/CurriculumsPage";
import { DepartmentFormPage } from "@/pages/departments/DepartmentFormPage";
import { DepartmentsPage } from "@/pages/departments/DepartmentsPage";
import { BillingPage } from "@/pages/finance/BillingPage";
import { FinanceDashboardPage } from "@/pages/finance/FinanceDashboardPage";
import { FinanceReportsPage } from "@/pages/finance/FinanceReportsPage";
import { InvoicesPage } from "@/pages/finance/InvoicesPage";
import { LedgerPage } from "@/pages/finance/LedgerPage";
import { PaymentsPage } from "@/pages/finance/PaymentsPage";
import { StudentFeeStatementPage } from "@/pages/finance/StudentFeeStatementPage";
import { AllFeeAssignmentsPage } from "@/pages/feeTemplates/AllFeeAssignmentsPage";
import { FeeTemplateAssignmentsPage } from "@/pages/feeTemplates/FeeTemplateAssignmentsPage";
import { FeeTemplateFormPage } from "@/pages/feeTemplates/FeeTemplateFormPage";
import { FeeTemplateItemsPage } from "@/pages/feeTemplates/FeeTemplateItemsPage";
import { FeeTemplatesPage } from "@/pages/feeTemplates/FeeTemplatesPage";
import { AdminComplaintDetailPage } from "@/pages/complaints/AdminComplaintDetailPage";
import { AdminComplaintsPage } from "@/pages/complaints/AdminComplaintsPage";
import { HostelAllocationsPage } from "@/pages/hostels/HostelAllocationsPage";
import { HostelFormPage } from "@/pages/hostels/HostelFormPage";
import { HostelsPage } from "@/pages/hostels/HostelsPage";
import { AddMarksPage } from "@/pages/grades/AddMarksPage";
import { MarksheetPage } from "@/pages/grades/MarksheetPage";
import { PublishMarksPage } from "@/pages/grades/PublishMarksPage";
import { ViewMarksPage } from "@/pages/grades/ViewMarksPage";
import { LectureRoomFormPage } from "@/pages/lectureRooms/LectureRoomFormPage";
import { LectureRoomsPage } from "@/pages/lectureRooms/LectureRoomsPage";
import { TimetableCreatePage } from "@/pages/timetables/TimetableCreatePage";
import { TimetableViewPage } from "@/pages/timetables/TimetableViewPage";
import { StaffFormPage } from "@/pages/staffs/StaffFormPage";
import { StaffsPage } from "@/pages/staffs/StaffsPage";
import { AdmissionLetterPage } from "@/pages/students/AdmissionLetterPage";
import { CourseChangePage } from "@/pages/students/CourseChangePage";
import { CourseTransfersPage } from "@/pages/students/CourseTransfersPage";
import { StudentFormPage } from "@/pages/students/StudentFormPage";
import { StudentsPage } from "@/pages/students/StudentsPage";
import { UnitFormPage } from "@/pages/units/UnitFormPage";
import { UnitsPage } from "@/pages/units/UnitsPage";

export function AdminRoutes() {
  return (
    <>
      <Route path="/dashboard" element={<AdminDashboard />} />
      <Route path="/departments" element={<DepartmentsPage />} />
      <Route path="/departments/create" element={<DepartmentFormPage />} />
      <Route path="/departments/:departmentId/edit" element={<DepartmentFormPage />} />
      <Route path="/certification-authorities" element={<CertificationAuthoritiesPage />} />
      <Route path="/certification-authorities/create" element={<CertificationAuthorityFormPage />} />
      <Route path="/certification-authorities/:authorityId/edit" element={<CertificationAuthorityFormPage />} />
      <Route path="/certification-levels" element={<CertificationLevelsPage />} />
      <Route path="/certification-levels/create" element={<CertificationLevelFormPage />} />
      <Route path="/certification-levels/:levelId/edit" element={<CertificationLevelFormPage />} />
      <Route path="/courses" element={<CoursesPage />} />
      <Route path="/courses/create" element={<CourseFormPage />} />
      <Route path="/courses/:courseId/edit" element={<CourseFormPage />} />
      <Route path="/courses/enrolments" element={<CourseEnrolmentsPage />} />
      <Route path="/curriculums" element={<CurriculumsPage />} />
      <Route path="/curriculums/create" element={<CurriculumFormPage />} />
      <Route path="/curriculums/:curriculumId/edit" element={<CurriculumFormPage />} />
      <Route path="/curriculums/mappings" element={<CurriculumMappingsPage />} />
      <Route path="/units" element={<UnitsPage />} />
      <Route path="/units/create" element={<UnitFormPage />} />
      <Route path="/units/:unitId/edit" element={<UnitFormPage />} />
      <Route path="/lecture-rooms" element={<LectureRoomsPage />} />
      <Route path="/lecture-rooms/create" element={<LectureRoomFormPage />} />
      <Route path="/lecture-rooms/:roomId/edit" element={<LectureRoomFormPage />} />
      <Route path="/academic-calendar/years" element={<AcademicYearsPage />} />
      <Route path="/academic-calendar/years/create" element={<AcademicYearFormPage />} />
      <Route path="/academic-calendar/years/:yearId/edit" element={<AcademicYearFormPage />} />
      <Route path="/academic-calendar/sessions" element={<AcademicSessionsPage />} />
      <Route path="/academic-calendar/sessions/create" element={<AcademicSessionFormPage />} />
      <Route path="/academic-calendar/sessions/:sessionId/edit" element={<AcademicSessionFormPage />} />
      <Route path="/finance/dashboard" element={<FinanceDashboardPage />} />
      <Route path="/finance/reports" element={<FinanceReportsPage />} />
      <Route path="/finance/statement" element={<StudentFeeStatementPage />} />
      <Route path="/finance/statement/:studentId" element={<StudentFeeStatementPage />} />
      <Route path="/finance/billing" element={<BillingPage />} />
      <Route path="/finance/invoices" element={<InvoicesPage />} />
      <Route path="/finance/payments" element={<PaymentsPage />} />
      <Route path="/finance/ledger" element={<LedgerPage />} />
      <Route path="/finance/fee-templates" element={<FeeTemplatesPage />} />
      <Route path="/finance/fee-templates/create" element={<FeeTemplateFormPage />} />
      <Route path="/finance/fee-templates/:templateId/edit" element={<FeeTemplateFormPage />} />
      <Route path="/finance/fee-templates/:templateId/assign" element={<FeeTemplateAssignmentsPage />} />
      <Route path="/finance/fee-assignments" element={<AllFeeAssignmentsPage />} />
      <Route path="/finance/fee-templates/items" element={<FeeTemplateItemsPage />} />
      <Route path="/staffs" element={<StaffsPage />} />
      <Route path="/staffs/create" element={<StaffFormPage />} />
      <Route path="/staffs/:staffId/edit" element={<StaffFormPage />} />
      <Route path="/students" element={<StudentsPage />} />
      <Route path="/students/create" element={<StudentFormPage />} />
      <Route path="/students/:studentId/edit" element={<StudentFormPage />} />
      <Route path="/students/:studentId/admission-letter" element={<AdmissionLetterPage />} />
      <Route path="/students/course-change" element={<CourseChangePage />} />
      <Route path="/students/transfers" element={<CourseTransfersPage />} />
      <Route path="/access-roles" element={<AccessRolesPage />} />
      <Route path="/access-roles/create" element={<AccessRoleFormPage />} />
      <Route path="/access-roles/:roleId/edit" element={<AccessRoleFormPage />} />
      <Route path="/access-roles/:roleId/permissions" element={<AccessRolePermissionsPage />} />
      <Route path="/operations/enrollments" element={<SessionEnrolmentsPage />} />
      <Route path="/operations/status-logs" element={<StudentStatusLogsPage />} />
      <Route path="/assessments" element={<ViewMarksPage />} />
      <Route path="/assessments/add" element={<AddMarksPage />} />
      <Route path="/assessments/publish" element={<PublishMarksPage />} />
      <Route path="/assessments/marksheet" element={<MarksheetPage />} />
      <Route path="/timetables" element={<TimetableViewPage />} />
      <Route path="/timetables/create" element={<TimetableCreatePage />} />
      <Route path="/timetables/:timetableId/edit" element={<TimetableCreatePage />} />
      <Route path="/academic-calendar/calendar" element={<CalendarPage />} />
      <Route path="/attendance" element={<AttendanceIndexPage />} />
      <Route path="/attendance/mark" element={<AttendanceMarkPage />} />
      <Route path="/complaints" element={<AdminComplaintsPage />} />
      <Route path="/complaints/:complaintId" element={<AdminComplaintDetailPage />} />
      <Route path="/hostels" element={<HostelsPage />} />
      <Route path="/hostels/create" element={<HostelFormPage />} />
      <Route path="/hostels/:hostelId/edit" element={<HostelFormPage />} />
      <Route path="/hostel-allocations" element={<HostelAllocationsPage />} />
      <Route path="/system-configurations" element={<SystemConfigurationsPage />} />
    </>
  );
}

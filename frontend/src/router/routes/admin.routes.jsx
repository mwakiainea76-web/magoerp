import { Route } from "react-router";

import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AccessRoleFormPage } from "@/pages/access/AccessRoleFormPage";
import { AccessRolePermissionsPage } from "@/pages/access/AccessRolePermissionsPage";
import { AccessRolesPage } from "@/pages/access/AccessRolesPage";
import { CalendarPage } from "@/pages/calendar/CalendarPage";
import { StudentStatusLogsPage } from "@/pages/enrolments/StudentStatusLogsPage";
import { SystemConfigurationsPage } from "@/pages/admin/SystemConfigurationsPage";
import { InstitutionDetailsPage } from "@/pages/admin/InstitutionDetailsPage";
import { AcademicSessionFormPage } from "@/pages/academicCalendar/AcademicSessionFormPage";
import { AcademicSessionsPage } from "@/pages/academicCalendar/AcademicSessionsPage";
import { AcademicYearFormPage } from "@/pages/academicCalendar/AcademicYearFormPage";
import { SessionEnrolmentsPage } from "@/pages/academicCalendar/SessionEnrolmentsPage";
import { AcademicYearsPage } from "@/pages/academicCalendar/AcademicYearsPage";
import { AttendanceIndexPage } from "@/pages/attendance/AttendanceIndexPage";
import { AttendanceMarkPage } from "@/pages/attendance/AttendanceMarkPage";
import { CertificationAuthoritiesPage } from "@/pages/certificationAuthorities/CertificationAuthoritiesPage";
import { CertificationAuthorityFormPage } from "@/pages/certificationAuthorities/CertificationAuthorityFormPage";
import { CertificationAuthorityGradesPage } from "@/pages/certificationAuthorities/CertificationAuthorityGradesPage";
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
import { AdminSupportRequestDetailPage } from "@/pages/support-requests/AdminSupportRequestDetailPage";
import { AdminSupportRequestsPage } from "@/pages/support-requests/AdminSupportRequestsPage";
import { HostelAllocationsPage } from "@/pages/hostels/HostelAllocationsPage";
import { HostelFormPage } from "@/pages/hostels/HostelFormPage";
import { HostelsPage } from "@/pages/hostels/HostelsPage";
import { AddMarksPage } from "@/pages/grades/AddMarksPage";
import { TranscriptPage } from "@/pages/grades/TranscriptPage";
import { MarksheetPage } from "@/pages/grades/MarksheetPage";
import { PublishMarksPage } from "@/pages/grades/PublishMarksPage";
import { ViewMarksPage } from "@/pages/grades/ViewMarksPage";
import { LectureRoomFormPage } from "@/pages/lectureRooms/LectureRoomFormPage";
import { LectureRoomsPage } from "@/pages/lectureRooms/LectureRoomsPage";
import { TimetableCreatePage } from "@/pages/timetables/TimetableCreatePage";
import { TimetablePage } from "@/pages/timetables/TimetablePage";
import { StaffFormPage } from "@/pages/staffs/StaffFormPage";
import { StaffsPage } from "@/pages/staffs/StaffsPage";
import { AdmissionLetterPage } from "@/pages/students/AdmissionLetterPage";
import { CourseChangePage } from "@/pages/students/CourseChangePage";
import { CourseTransfersPage } from "@/pages/students/CourseTransfersPage";
import { StudentFormPage } from "@/pages/students/StudentFormPage";
import { StudentsPage } from "@/pages/students/StudentsPage";
import { UnitFormPage } from "@/pages/units/UnitFormPage";
import { UnitsPage } from "@/pages/units/UnitsPage";

export const AdminRoutes = (
  <>
    <Route path="/admin/dashboard" element={<AdminDashboard />} />
    <Route path="/admin/departments" element={<DepartmentsPage />} />
    <Route path="/admin/departments/create" element={<DepartmentFormPage />} />
    <Route path="/admin/departments/:departmentId/edit" element={<DepartmentFormPage />} />
    <Route path="/admin/certification-authorities" element={<CertificationAuthoritiesPage />} />
    <Route path="/admin/certification-authorities/create" element={<CertificationAuthorityFormPage />} />
    <Route path="/admin/certification-authorities/:authorityId/edit" element={<CertificationAuthorityFormPage />} />
    <Route path="/admin/certification-authorities/grades" element={<CertificationAuthorityGradesPage />} />
    <Route path="/admin/certification-levels" element={<CertificationLevelsPage />} />
    <Route path="/admin/certification-levels/create" element={<CertificationLevelFormPage />} />
    <Route path="/admin/certification-levels/:levelId/edit" element={<CertificationLevelFormPage />} />
    <Route path="/admin/courses" element={<CoursesPage />} />
    <Route path="/admin/courses/create" element={<CourseFormPage />} />
    <Route path="/admin/courses/:courseId/edit" element={<CourseFormPage />} />
    <Route path="/admin/courses/enrolments" element={<CourseEnrolmentsPage />} />
    <Route path="/admin/curriculums" element={<CurriculumsPage />} />
    <Route path="/admin/curriculums/create" element={<CurriculumFormPage />} />
    <Route path="/admin/curriculums/:curriculumId/edit" element={<CurriculumFormPage />} />
    <Route path="/admin/curriculums/mappings" element={<CurriculumMappingsPage />} />
    <Route path="/admin/units" element={<UnitsPage />} />
    <Route path="/admin/units/create" element={<UnitFormPage />} />
    <Route path="/admin/units/:unitId/edit" element={<UnitFormPage />} />
    <Route path="/admin/lecture-rooms" element={<LectureRoomsPage />} />
    <Route path="/admin/lecture-rooms/create" element={<LectureRoomFormPage />} />
    <Route path="/admin/lecture-rooms/:roomId/edit" element={<LectureRoomFormPage />} />
    <Route path="/admin/academic-calendar/years" element={<AcademicYearsPage />} />
    <Route path="/admin/academic-calendar/years/create" element={<AcademicYearFormPage />} />
    <Route path="/admin/academic-calendar/years/:yearId/edit" element={<AcademicYearFormPage />} />
    <Route path="/admin/academic-calendar/sessions" element={<AcademicSessionsPage />} />
    <Route path="/admin/academic-calendar/sessions/create" element={<AcademicSessionFormPage />} />
    <Route path="/admin/academic-calendar/sessions/:sessionId/edit" element={<AcademicSessionFormPage />} />
    <Route path="/admin/finance/dashboard" element={<FinanceDashboardPage />} />
    <Route path="/admin/finance/reports" element={<FinanceReportsPage />} />
    <Route path="/admin/finance/statement" element={<StudentFeeStatementPage role="admin" />} />
    <Route path="/admin/finance/statement/:studentId" element={<StudentFeeStatementPage role="admin" />} />
    <Route path="/admin/finance/billing" element={<BillingPage />} />
    <Route path="/admin/finance/invoices" element={<InvoicesPage />} />
    <Route path="/admin/finance/payments" element={<PaymentsPage />} />
    <Route path="/admin/finance/ledger" element={<LedgerPage />} />
    <Route path="/admin/finance/fee-templates" element={<FeeTemplatesPage />} />
    <Route path="/admin/finance/fee-templates/create" element={<FeeTemplateFormPage />} />
    <Route path="/admin/finance/fee-templates/:templateId/edit" element={<FeeTemplateFormPage />} />
    <Route path="/admin/finance/fee-templates/:templateId/assign" element={<FeeTemplateAssignmentsPage />} />
    <Route path="/admin/finance/fee-assignments" element={<AllFeeAssignmentsPage />} />
    <Route path="/admin/finance/fee-templates/items" element={<FeeTemplateItemsPage />} />
    <Route path="/admin/staffs" element={<StaffsPage />} />
    <Route path="/admin/staffs/create" element={<StaffFormPage />} />
    <Route path="/admin/staffs/:staffId/edit" element={<StaffFormPage />} />
    <Route path="/admin/students" element={<StudentsPage />} />
    <Route path="/admin/students/create" element={<StudentFormPage />} />
    <Route path="/admin/students/:studentId/edit" element={<StudentFormPage />} />
    <Route path="/admin/students/:studentId/admission-letter" element={<AdmissionLetterPage />} />
    <Route path="/admin/students/course-change" element={<CourseChangePage />} />
    <Route path="/admin/students/transfers" element={<CourseTransfersPage />} />
    <Route path="/admin/access-roles" element={<AccessRolesPage />} />
    <Route path="/admin/access-roles/create" element={<AccessRoleFormPage />} />
    <Route path="/admin/access-roles/:roleId/edit" element={<AccessRoleFormPage />} />
    <Route path="/admin/access-roles/:roleId/permissions" element={<AccessRolePermissionsPage />} />
    <Route path="/admin/operations/enrollments" element={<SessionEnrolmentsPage />} />
    <Route path="/admin/operations/status-logs" element={<StudentStatusLogsPage />} />
    <Route path="/admin/assessments" element={<ViewMarksPage />} />
    <Route path="/admin/assessments/add" element={<AddMarksPage />} />
    <Route path="/admin/assessments/publish" element={<PublishMarksPage />} />
    <Route path="/admin/assessments/marksheet" element={<MarksheetPage role="admin" />} />
    <Route path="/admin/assessments/transcript" element={<TranscriptPage role="admin" />} />
    <Route path="/admin/timetables" element={<TimetablePage role="admin" />} />
    <Route path="/admin/timetables/create" element={<TimetableCreatePage />} />
    <Route path="/admin/timetables/:timetableId/edit" element={<TimetableCreatePage />} />
    <Route path="/admin/academic-calendar/calendar" element={<CalendarPage />} />
    <Route path="/admin/attendance" element={<AttendanceIndexPage />} />
    <Route path="/admin/attendance/mark" element={<AttendanceMarkPage />} />
    <Route path="/admin/support-requests" element={<AdminSupportRequestsPage />} />
    <Route path="/admin/support-requests/:supportRequestId" element={<AdminSupportRequestDetailPage />} />
    <Route path="/admin/hostels" element={<HostelsPage />} />
    <Route path="/admin/hostels/create" element={<HostelFormPage />} />
    <Route path="/admin/hostels/:hostelId/edit" element={<HostelFormPage />} />
    <Route path="/admin/hostel-allocations" element={<HostelAllocationsPage />} />
    <Route path="/admin/system-configurations" element={<SystemConfigurationsPage />} />
    <Route path="/admin/institution-details" element={<InstitutionDetailsPage />} />
  </>
);

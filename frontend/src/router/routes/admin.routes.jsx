/* eslint-disable react-refresh/only-export-components */
import { lazy } from "react";
import { Route } from "react-router";
import { FinanceRoutes } from "./finance.routes";

const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard").then((module) => ({ default: module.AdminDashboard })));
const AccessRoleFormPage = lazy(() => import("@/pages/access/AccessRoleFormPage").then((module) => ({ default: module.AccessRoleFormPage })));
const AccessRolePermissionsPage = lazy(() => import("@/pages/access/AccessRolePermissionsPage").then((module) => ({ default: module.AccessRolePermissionsPage })));
const AccessRolesPage = lazy(() => import("@/pages/access/AccessRolesPage").then((module) => ({ default: module.AccessRolesPage })));
const CalendarPage = lazy(() => import("@/pages/calendar/CalendarPage").then((module) => ({ default: module.CalendarPage })));
const SystemConfigurationsPage = lazy(() => import("@/pages/admin/SystemConfigurationsPage").then((module) => ({ default: module.SystemConfigurationsPage })));
const InstitutionDetailsPage = lazy(() => import("@/pages/admin/InstitutionDetailsPage").then((module) => ({ default: module.InstitutionDetailsPage })));
const AcademicSessionFormPage = lazy(() => import("@/pages/academicCalendar/AcademicSessionFormPage").then((module) => ({ default: module.AcademicSessionFormPage })));
const AcademicSessionsPage = lazy(() => import("@/pages/academicCalendar/AcademicSessionsPage").then((module) => ({ default: module.AcademicSessionsPage })));
const AcademicYearFormPage = lazy(() => import("@/pages/academicCalendar/AcademicYearFormPage").then((module) => ({ default: module.AcademicYearFormPage })));
const SessionEnrolmentsPage = lazy(() => import("@/pages/academicCalendar/SessionEnrolmentsPage").then((module) => ({ default: module.SessionEnrolmentsPage })));
const AcademicYearsPage = lazy(() => import("@/pages/academicCalendar/AcademicYearsPage").then((module) => ({ default: module.AcademicYearsPage })));
const AttendanceIndexPage = lazy(() => import("@/pages/attendance/AttendanceIndexPage").then((module) => ({ default: module.AttendanceIndexPage })));
const AttendanceMarkPage = lazy(() => import("@/pages/attendance/AttendanceMarkPage").then((module) => ({ default: module.AttendanceMarkPage })));
const CertificationAuthoritiesPage = lazy(() => import("@/pages/certificationAuthorities/CertificationAuthoritiesPage").then((module) => ({ default: module.CertificationAuthoritiesPage })));
const CertificationAuthorityFormPage = lazy(() => import("@/pages/certificationAuthorities/CertificationAuthorityFormPage").then((module) => ({ default: module.CertificationAuthorityFormPage })));
const CertificationWizardPage = lazy(() => import("@/pages/certificationAuthorities/CertificationWizardPage").then((module) => ({ default: module.CertificationWizardPage })));
const CertificationAuthorityGradesPage = lazy(() => import("@/pages/certificationAuthorities/CertificationAuthorityGradesPage").then((module) => ({ default: module.CertificationAuthorityGradesPage })));
const CertificationLevelFormPage = lazy(() => import("@/pages/certificationAuthorities/CertificationLevelFormPage").then((module) => ({ default: module.CertificationLevelFormPage })));
const CertificationLevelsPage = lazy(() => import("@/pages/certificationAuthorities/CertificationLevelsPage").then((module) => ({ default: module.CertificationLevelsPage })));
const CourseFormPage = lazy(() => import("@/pages/courses/CourseFormPage").then((module) => ({ default: module.CourseFormPage })));
const CourseEnrolmentsPage = lazy(() => import("@/pages/courses/CourseEnrolmentsPage").then((module) => ({ default: module.CourseEnrolmentsPage })));
const CoursesPage = lazy(() => import("@/pages/courses/CoursesPage").then((module) => ({ default: module.CoursesPage })));
const CurriculumFormPage = lazy(() => import("@/pages/curriculums/CurriculumFormPage").then((module) => ({ default: module.CurriculumFormPage })));
const CurriculumMappingsPage = lazy(() => import("@/pages/curriculums/CurriculumMappingsPage").then((module) => ({ default: module.CurriculumMappingsPage })));
const CurriculumsPage = lazy(() => import("@/pages/curriculums/CurriculumsPage").then((module) => ({ default: module.CurriculumsPage })));
const DepartmentFormPage = lazy(() => import("@/pages/departments/DepartmentFormPage").then((module) => ({ default: module.DepartmentFormPage })));
const DepartmentsPage = lazy(() => import("@/pages/departments/DepartmentsPage").then((module) => ({ default: module.DepartmentsPage })));
const AdminSupportRequestDetailPage = lazy(() => import("@/pages/support-requests/AdminSupportRequestDetailPage").then((module) => ({ default: module.AdminSupportRequestDetailPage })));
const AdminSupportRequestsPage = lazy(() => import("@/pages/support-requests/AdminSupportRequestsPage").then((module) => ({ default: module.AdminSupportRequestsPage })));
const HostelAllocationsPage = lazy(() => import("@/pages/hostels/HostelAllocationsPage").then((module) => ({ default: module.HostelAllocationsPage })));
const HostelFormPage = lazy(() => import("@/pages/hostels/HostelFormPage").then((module) => ({ default: module.HostelFormPage })));
const HostelRoomsPage = lazy(() => import("@/pages/hostels/HostelRoomsPage").then((module) => ({ default: module.HostelRoomsPage })));
const HostelsPage = lazy(() => import("@/pages/hostels/HostelsPage").then((module) => ({ default: module.HostelsPage })));
const AddMarksPage = lazy(() => import("@/pages/grades/AddMarksPage").then((module) => ({ default: module.AddMarksPage })));
const TranscriptPage = lazy(() => import("@/pages/grades/TranscriptPage").then((module) => ({ default: module.TranscriptPage })));
const MarksheetPage = lazy(() => import("@/pages/grades/MarksheetPage").then((module) => ({ default: module.MarksheetPage })));
const PublishMarksPage = lazy(() => import("@/pages/grades/PublishMarksPage").then((module) => ({ default: module.PublishMarksPage })));
const ViewMarksPage = lazy(() => import("@/pages/grades/ViewMarksPage").then((module) => ({ default: module.ViewMarksPage })));
const ExamSeriesPage = lazy(() => import("@/pages/grades/ExamSeriesPage").then((module) => ({ default: module.ExamSeriesPage })));
const LectureRoomFormPage = lazy(() => import("@/pages/lectureRooms/LectureRoomFormPage").then((module) => ({ default: module.LectureRoomFormPage })));
const LectureRoomsPage = lazy(() => import("@/pages/lectureRooms/LectureRoomsPage").then((module) => ({ default: module.LectureRoomsPage })));
const TimetableCreatePage = lazy(() => import("@/pages/timetables/TimetableCreatePage").then((module) => ({ default: module.TimetableCreatePage })));
const TimetablePage = lazy(() => import("@/pages/timetables/TimetablePage").then((module) => ({ default: module.TimetablePage })));
const StaffFormPage = lazy(() => import("@/pages/staffs/StaffFormPage").then((module) => ({ default: module.StaffFormPage })));
const StaffsPage = lazy(() => import("@/pages/staffs/StaffsPage").then((module) => ({ default: module.StaffsPage })));
const StaffStatusLogsPage = lazy(() => import("@/pages/staffs/StaffStatusLogsPage").then((module) => ({ default: module.StaffStatusLogsPage })));
const StudentStatusLogsPage = lazy(() => import("@/pages/enrolments/StudentStatusLogsPage").then((module) => ({ default: module.StudentStatusLogsPage })));
const PasswordResetPage = lazy(() => import("@/pages/admin/PasswordResetPage").then((module) => ({ default: module.PasswordResetPage })));
const AdmissionLetterPage = lazy(() => import("@/pages/students/AdmissionLetterPage").then((module) => ({ default: module.AdmissionLetterPage })));
const CourseChangePage = lazy(() => import("@/pages/students/CourseChangePage").then((module) => ({ default: module.CourseChangePage })));
const CourseTransfersPage = lazy(() => import("@/pages/students/CourseTransfersPage").then((module) => ({ default: module.CourseTransfersPage })));
const StudentFormPage = lazy(() => import("@/pages/students/StudentFormPage").then((module) => ({ default: module.StudentFormPage })));
const StudentsPage = lazy(() => import("@/pages/students/StudentsPage").then((module) => ({ default: module.StudentsPage })));
const UnitFormPage = lazy(() => import("@/pages/units/UnitFormPage").then((module) => ({ default: module.UnitFormPage })));
const UnitsPage = lazy(() => import("@/pages/units/UnitsPage").then((module) => ({ default: module.UnitsPage })));

export const AdminRoutes = (
  <>
    <Route path="/admin/dashboard" element={<AdminDashboard />} />
    <Route path="/admin/departments" element={<DepartmentsPage />} />
    <Route path="/admin/departments/create" element={<DepartmentFormPage />} />
    <Route path="/admin/departments/:departmentId/edit" element={<DepartmentFormPage />} />
    <Route path="/admin/certification-authorities" element={<CertificationAuthoritiesPage />} />
    <Route path="/admin/certification-authorities/create" element={<CertificationWizardPage />} />
    <Route path="/admin/certification-authorities/:authorityId/edit" element={<CertificationAuthorityFormPage />} />
    <Route path="/admin/certification-authorities/grades" element={<CertificationAuthorityGradesPage />} />
    <Route path="/admin/certification-levels" element={<CertificationLevelsPage />} />
    <Route path="/admin/certification-levels/create" element={<CertificationLevelFormPage />} />
    <Route path="/admin/certification-levels/:levelId/edit" element={<CertificationLevelFormPage />} />
    <Route path="/admin/courses" element={<CoursesPage />} />
    <Route path="/admin/courses/create" element={<CourseFormPage />} />
    <Route path="/admin/courses/:courseId/edit" element={<CourseFormPage />} />
    <Route path="/admin/courses/enrolments" element={<CourseEnrolmentsPage />} />
    <Route path="/admin/courses/course-change" element={<CourseChangePage />} />
    <Route path="/admin/courses/transfers" element={<CourseTransfersPage />} />
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
    <Route path="/admin/staffs" element={<StaffsPage />} />
    <Route path="/admin/staffs/create" element={<StaffFormPage />} />
    <Route path="/admin/staffs/reset-password" element={<PasswordResetPage mode="staff" />} />
    <Route path="/admin/staffs/status-logs" element={<StaffStatusLogsPage />} />
    <Route path="/admin/staffs/:staffId/edit" element={<StaffFormPage />} />
    <Route path="/admin/students" element={<StudentsPage />} />
    <Route path="/admin/students/create" element={<StudentFormPage />} />
    <Route path="/admin/students/reset-password" element={<PasswordResetPage mode="student" />} />
    <Route path="/admin/students/status-logs" element={<StudentStatusLogsPage />} />
    <Route path="/admin/students/:studentId/edit" element={<StudentFormPage />} />
    <Route path="/admin/students/:studentId/admission-letter" element={<AdmissionLetterPage />} />
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
    <Route path="/admin/exam-series" element={<ExamSeriesPage />} />
    <Route path="/admin/exam-series/create" element={<ExamSeriesPage />} />
    <Route path="/admin/exam-series/:seriesId/edit" element={<ExamSeriesPage />} />
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
    <Route path="/admin/hostels/rooms" element={<HostelRoomsPage />} />
    <Route path="/admin/hostels/:hostelId/edit" element={<HostelFormPage />} />
    <Route path="/admin/hostel-allocations" element={<HostelAllocationsPage />} />
    <Route path="/admin/system-configurations" element={<SystemConfigurationsPage />} />
    <Route path="/admin/institution-details" element={<InstitutionDetailsPage />} />
    {FinanceRoutes}
  </>
);

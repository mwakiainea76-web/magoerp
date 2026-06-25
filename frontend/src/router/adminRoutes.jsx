import { Route } from "react-router";

import { AccessRoleFormPage } from "@/pages/access/AccessRoleFormPage";
import { StudentStatusLogsPage } from "@/pages/enrolments/StudentStatusLogsPage";
import { AccessRolePermissionsPage } from "@/pages/access/AccessRolePermissionsPage";
import { AccessRolesPage } from "@/pages/access/AccessRolesPage";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AcademicSessionFormPage } from "@/pages/academicCalendar/AcademicSessionFormPage";
import { AcademicSessionsPage } from "@/pages/academicCalendar/AcademicSessionsPage";
import { AcademicYearFormPage } from "@/pages/academicCalendar/AcademicYearFormPage";
import { SessionEnrolmentsPage } from "@/pages/academicCalendar/SessionEnrolmentsPage";
import { AcademicYearsPage } from "@/pages/academicCalendar/AcademicYearsPage";
import { CertificationAuthoritiesPage } from "@/pages/certificationAuthorities/CertificationAuthoritiesPage";
import { CertificationAuthorityFormPage } from "@/pages/certificationAuthorities/CertificationAuthorityFormPage";
import { CertificationLevelFormPage } from "@/pages/certificationLevels/CertificationLevelFormPage";
import { CertificationLevelsPage } from "@/pages/certificationLevels/CertificationLevelsPage";
import { CourseFormPage } from "@/pages/courses/CourseFormPage";
import { CourseEnrolmentsPage } from "@/pages/courses/CourseEnrolmentsPage";
import { CoursesPage } from "@/pages/courses/CoursesPage";
import { CurriculumFormPage } from "@/pages/curriculums/CurriculumFormPage";
import { CurriculumMappingsPage } from "@/pages/curriculums/CurriculumMappingsPage";
import { CurriculumsPage } from "@/pages/curriculums/CurriculumsPage";
import { DepartmentFormPage } from "@/pages/departments/DepartmentFormPage";
import { DepartmentsPage } from "@/pages/departments/DepartmentsPage";
import { InvoiceTemplateAssignmentsPage } from "@/pages/invoiceTemplates/InvoiceTemplateAssignmentsPage";
import { InvoiceTemplateFormPage } from "@/pages/invoiceTemplates/InvoiceTemplateFormPage";
import { InvoiceTemplateItemsPage } from "@/pages/invoiceTemplates/InvoiceTemplateItemsPage";
import { InvoiceTemplatesPage } from "@/pages/invoiceTemplates/InvoiceTemplatesPage";
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
      <Route path="/finance/invoice-templates" element={<InvoiceTemplatesPage />} />
      <Route path="/finance/invoice-templates/create" element={<InvoiceTemplateFormPage />} />
      <Route path="/finance/invoice-templates/:templateId/edit" element={<InvoiceTemplateFormPage />} />
      <Route path="/finance/invoice-templates/:templateId/assign" element={<InvoiceTemplateAssignmentsPage />} />
      <Route path="/finance/invoice-templates/items" element={<InvoiceTemplateItemsPage />} />
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
      <Route path="/complaints" element={<AdminComplaintsPage />} />
      <Route path="/complaints/:complaintId" element={<AdminComplaintDetailPage />} />
      <Route path="/hostels" element={<HostelsPage />} />
      <Route path="/hostels/create" element={<HostelFormPage />} />
      <Route path="/hostels/:hostelId/edit" element={<HostelFormPage />} />
      <Route path="/hostel-allocations" element={<HostelAllocationsPage />} />
    </>
  );
}

import { Route } from "react-router";

import { AccessRoleFormPage } from "@/pages/access/AccessRoleFormPage";
import { AccessRolePermissionsPage } from "@/pages/access/AccessRolePermissionsPage";
import { AccessRolesPage } from "@/pages/access/AccessRolesPage";
import { AdminDashboard } from "@/pages/admin/AdminDashboard";
import { AcademicSessionFormPage } from "@/pages/academicCalendar/AcademicSessionFormPage";
import { AcademicSessionsPage } from "@/pages/academicCalendar/AcademicSessionsPage";
import { AcademicYearFormPage } from "@/pages/academicCalendar/AcademicYearFormPage";
import { AcademicYearsPage } from "@/pages/academicCalendar/AcademicYearsPage";
import { CertificationAuthoritiesPage } from "@/pages/certificationAuthorities/CertificationAuthoritiesPage";
import { CertificationAuthorityFormPage } from "@/pages/certificationAuthorities/CertificationAuthorityFormPage";
import { CertificationLevelFormPage } from "@/pages/certificationLevels/CertificationLevelFormPage";
import { CertificationLevelsPage } from "@/pages/certificationLevels/CertificationLevelsPage";
import { CourseFormPage } from "@/pages/courses/CourseFormPage";
import { CoursesPage } from "@/pages/courses/CoursesPage";
import { CurriculumFormPage } from "@/pages/curriculums/CurriculumFormPage";
import { CurriculumsPage } from "@/pages/curriculums/CurriculumsPage";
import { DepartmentFormPage } from "@/pages/departments/DepartmentFormPage";
import { DepartmentsPage } from "@/pages/departments/DepartmentsPage";
import { FeePlanFormPage } from "@/pages/feePlans/FeePlanFormPage";
import { FeePlanItemsPage } from "@/pages/feePlans/FeePlanItemsPage";
import { FeePlansPage } from "@/pages/feePlans/FeePlansPage";
import { StaffFormPage } from "@/pages/staffs/StaffFormPage";
import { StaffsPage } from "@/pages/staffs/StaffsPage";
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
      <Route path="/curriculums" element={<CurriculumsPage />} />
      <Route path="/curriculums/create" element={<CurriculumFormPage />} />
      <Route path="/curriculums/:curriculumId/edit" element={<CurriculumFormPage />} />
      <Route path="/units" element={<UnitsPage />} />
      <Route path="/units/create" element={<UnitFormPage />} />
      <Route path="/units/:unitId/edit" element={<UnitFormPage />} />
      <Route path="/academic-calendar/years" element={<AcademicYearsPage />} />
      <Route path="/academic-calendar/years/create" element={<AcademicYearFormPage />} />
      <Route path="/academic-calendar/years/:yearId/edit" element={<AcademicYearFormPage />} />
      <Route path="/academic-calendar/sessions" element={<AcademicSessionsPage />} />
      <Route path="/academic-calendar/sessions/create" element={<AcademicSessionFormPage />} />
      <Route path="/academic-calendar/sessions/:sessionId/edit" element={<AcademicSessionFormPage />} />
      <Route path="/finance/fee-plans" element={<FeePlansPage />} />
      <Route path="/finance/fee-plans/create" element={<FeePlanFormPage />} />
      <Route path="/finance/fee-plans/:planId/edit" element={<FeePlanFormPage />} />
      <Route path="/finance/fee-plans/items" element={<FeePlanItemsPage />} />
      <Route path="/staffs" element={<StaffsPage />} />
      <Route path="/staffs/create" element={<StaffFormPage />} />
      <Route path="/staffs/:staffId/edit" element={<StaffFormPage />} />
      <Route path="/access-roles" element={<AccessRolesPage />} />
      <Route path="/access-roles/create" element={<AccessRoleFormPage />} />
      <Route path="/access-roles/:roleId/edit" element={<AccessRoleFormPage />} />
      <Route path="/access-roles/:roleId/permissions" element={<AccessRolePermissionsPage />} />
    </>
  );
}

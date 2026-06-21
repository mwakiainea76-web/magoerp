import {
  ArrowRightLeft,
  Award,
  BarChart3,
  BookOpen,
  Building2,
  CalendarClock,
  ClipboardCheck,
  Coins,
  GraduationCap,
  Landmark,
  LayoutDashboard,
  School,
  Settings2,
  Users,
} from "lucide-react";

import { dashboardPathByRole } from "@/support/dashboardPaths";

export const sidebarNavigationByRole = {
  admin: [
    { label: "Admin Dashboard", to: dashboardPathByRole.admin, icon: LayoutDashboard },
    {
      label: "Institution",
      icon: Building2,
      children: [
        { label: "View Departments", to: "/institution/departments" },
        { label: "Add Department", to: "/institution/departments/create" },
        { label: "View Authorities", to: "/institution/certification-authorities" },
        { label: "Add Authority", to: "/institution/certification-authorities/create" },
        { label: "View Levels", to: "/institution/certification-levels" },
        { label: "Add Level", to: "/institution/certification-levels/create" },
      ],
    },
    {
      label: "Curriculums",
      icon: BookOpen,
      children: [
        { label: "All Curriculums", to: "/curriculums" },
        { label: "Add Curriculum", to: "/curriculums/create" },
      ],
    },
    {
      label: "Courses & Units",
      icon: GraduationCap,
      children: [
        { label: "All Courses", to: "/courses" },
        { label: "Course Enrollments", to: "/courses/enrollments" },
        { label: "Add Course", to: "/courses/create" },
        { label: "All Units", to: "/units" },
        { label: "Add Unit", to: "/units/create" },
      ],
    },
    {
      label: "Academic Calendar",
      icon: CalendarClock,
      children: [
        { label: "Academic Years", to: "/academic-calendar/years" },
        { label: "Add Academic Year", to: "/academic-calendar/years/create" },
        { label: "Academic Sessions", to: "/academic-calendar/sessions" },
        { label: "Add Session", to: "/academic-calendar/sessions/create" },
      ],
    },
    {
      label: "Timetables",
      icon: CalendarClock,
      defaultOpen: true,
      children: [
        { label: "View Timetables", to: "/timetables" },
        { label: "Add Timetable", to: "/timetables/create" },
      ],
    },
    {
      label: "Assessments",
      icon: ClipboardCheck,
      children: [
        { label: "View Marks", to: "/assessments" },
        { label: "Add Marks", to: "/assessments/add" },
        { label: "Publish Marks", to: "/assessments/publish" },
      ],
    },
    {
      label: "Analytics",
      icon: BarChart3,
      children: [{ label: "Reporting Dashboard", to: "/analytics" }],
    },
    {
      label: "Students",
      icon: GraduationCap,
      children: [
        { label: "Student Registry", to: "/students" },
        { label: "Admissions", to: "/students/create" },
      ],
    },
    {
      label: "Finance",
      icon: Landmark,
      children: [
        { label: "Invoices", to: "/finance/invoices" },
        { label: "Financial Ledger", to: "/finance/ledger" },
        { label: "Fee Plans", to: "/finance/fee-plans" },
        { label: "Add Fee Plan", to: "/finance/fee-plans/create" },
      ],
    },
    {
      label: "Operations",
      icon: Settings2,
      children: [{ label: "Enrollments", to: "/operations/enrollments" }],
    },
  ],
  trainer: [
    { label: "Dashboard", to: dashboardPathByRole.trainer, icon: LayoutDashboard },
    {
      label: "Courses & Units",
      icon: BookOpen,
      children: [{ label: "My Units", to: "/my-units" }],
    },
    {
      label: "Timetables",
      icon: CalendarClock,
      children: [{ label: "View Timetables", to: "/timetables" }],
    },
    {
      label: "Assessments",
      icon: ClipboardCheck,
      children: [{ label: "View Marks", to: "/assessments" }],
    },
    {
      label: "Analytics",
      icon: BarChart3,
      children: [{ label: "Reports", to: "/reports" }],
    },
    {
      label: "Students",
      icon: Users,
      children: [{ label: "Learners", to: "/learners" }],
    },
    {
      label: "Operations",
      icon: Settings2,
      children: [{ label: "Operations Hub", to: "/operations" }],
    },
  ],
  student: [
    { label: "Dashboard", to: dashboardPathByRole.student, icon: LayoutDashboard },
    {
      label: "Courses & Units",
      icon: BookOpen,
      children: [{ label: "My Courses", to: "/my-courses" }],
    },
    {
      label: "Timetables",
      icon: CalendarClock,
      children: [{ label: "View Timetables", to: "/timetables" }],
    },
    {
      label: "Assessments",
      icon: ClipboardCheck,
      children: [{ label: "View Assessments", to: "/assessments" }],
    },
    {
      label: "Analytics",
      icon: BarChart3,
      children: [{ label: "Reports", to: "/reports" }],
    },
    {
      label: "Finance",
      icon: Coins,
      children: [{ label: "Fee Statements", to: "/finance/statements" }],
    },
    {
      label: "Institution",
      icon: School,
      children: [{ label: "School Info", to: "/school-info" }],
    },
  ],
};

export function getSidebarLinks(role) {
  return sidebarNavigationByRole[role] ?? sidebarNavigationByRole.student;
}

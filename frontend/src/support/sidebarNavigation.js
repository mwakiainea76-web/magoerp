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
  ShieldCheck,
  Users,
} from "lucide-react";

import { dashboardPathByRole } from "@/support/dashboardPaths";

export const sidebarNavigationByRole = {
  admin: [
    { label: "Admin Dashboard", to: dashboardPathByRole.admin, icon: LayoutDashboard },
    {
      label: "Staff",
      icon: Users,
      children: [
        { label: "Staff Directory", to: "/staffs" },
        { label: "Add Staff", to: "/staffs/create" },
      ],
    },
    {
      label: "Department",
      icon: Building2,
      children: [
        { label: "View Departments", to: "/departments" },
        { label: "Add Department", to: "/departments/create" },
      ],
    },
    {
      label: "Certification Authority",
      icon: Award,
      children: [
        { label: "View Authorities", to: "/certification-authorities" },
        { label: "Add Authority", to: "/certification-authorities/create" },
        { label: "View Levels", to: "/certification-levels" },
        { label: "Add Level", to: "/certification-levels/create" },
      ],
    },
    {
      label: "Curriculums",
      icon: BookOpen,
      children: [
        { label: "All Curriculums", to: "/curriculums" },
        { label: "Add Curriculum", to: "/curriculums/create" },
        { label: "Course Mappings", to: "/curriculums/mappings" },
      ],
    },
    {
      label: "Courses",
      icon: GraduationCap,
      children: [
        { label: "All Courses", to: "/courses" },
                    { label: "Course Enrolments", to: "/courses/enrolments" },
        { label: "Add Course", to: "/courses/create" },
      ],
    },
    {
      label: "Units",
      icon: BookOpen,
      children: [
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
        { label: "School Calendar", to: "/academic-calendar/calendar" },
      ],
    },
    {
      label: "Timetables",
      icon: CalendarClock,
      defaultOpen: true,
      children: [
        { label: "View Timetables", to: "/timetables" },
        { label: "Add Timetable", to: "/timetables/create" },
        { label: "Lecture Rooms", to: "/lecture-rooms" },
        { label: "Class Attendance", to: "/attendance" },
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
        { label: "Course Change", to: "/students/course-change" },
        { label: "Transfer History", to: "/students/transfers" },
      ],
    },
    {
      label: "Finance",
      icon: Landmark,
      children: [
        { label: "Dashboard", to: "/finance/dashboard" },
        { label: "Billing", to: "/finance/billing" },
        { label: "Invoices", to: "/finance/invoices" },
        { label: "Payments", to: "/finance/payments" },
        { label: "Statements", to: "/finance/statement" },
        { label: "Financial Ledger", to: "/finance/ledger" },
        { label: "Fee Templates", to: "/finance/fee-templates" },
        { label: "Add Template", to: "/finance/fee-templates/create" },
      ],
    },
    {
      label: "Hostels",
      icon: Building2,
      children: [
        { label: "Manage Hostels", to: "/hostels" },
        { label: "Add Hostel", to: "/hostels/create" },
        { label: "Allocations", to: "/hostel-allocations" },
      ],
    },
    {
      label: "Operations",
      icon: Settings2,
      children: [
        { label: "Enrollments", to: "/operations/enrollments" },
        { label: "Status Logs", to: "/operations/status-logs" },
      ],
    },
    {
      label: "System Config",
      icon: Settings2,
      children: [
        { label: "System Configurations", to: "/system-configurations" },
      ],
    },
    {
      label: "Complaints",
      icon: ArrowRightLeft,
      children: [
        { label: "View Complaints", to: "/complaints" },
      ],
    },
    {
      label: "Access",
      icon: ShieldCheck,
      children: [
        { label: "Roles", to: "/access-roles" },
        { label: "Add Role", to: "/access-roles/create" },
      ],
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
      children: [
        { label: "View Timetables", to: "/timetables" },
        { label: "Class Attendance", to: "/attendance" },
      ],
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
    { label: "Dashboard", to: "/", icon: LayoutDashboard },
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
      label: "Complaints",
      icon: ArrowRightLeft,
      children: [
        { label: "My Complaints", to: "/complaints" },
        { label: "Submit Complaint", to: "/complaints/create" },
      ],
    },
    {
      label: "Hostel",
      icon: Building2,
      children: [{ label: "My Hostel", to: "/hostel" }],
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

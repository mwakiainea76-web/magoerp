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
        { label: "Staff Directory", to: "/admin/staffs" },
        { label: "Add Staff", to: "/admin/staffs/create" },
      ],
    },
    {
      label: "Department",
      icon: Building2,
      children: [
        { label: "View Departments", to: "/admin/departments" },
        { label: "Add Department", to: "/admin/departments/create" },
      ],
    },
    {
      label: "Certification Authority",
      icon: Award,
      children: [
        { label: "View Authorities", to: "/admin/certification-authorities" },
        { label: "Add Authority", to: "/admin/certification-authorities/create" },
        { label: "View Levels", to: "/admin/certification-levels" },
        { label: "Add Level", to: "/admin/certification-levels/create" },
      ],
    },
    {
      label: "Curriculums",
      icon: BookOpen,
      children: [
        { label: "All Curriculums", to: "/admin/curriculums" },
        { label: "Add Curriculum", to: "/admin/curriculums/create" },
        { label: "Course Mappings", to: "/admin/curriculums/mappings" },
      ],
    },
    {
      label: "Courses",
      icon: GraduationCap,
      children: [
        { label: "All Courses", to: "/admin/courses" },
        { label: "Course Enrolments", to: "/admin/courses/enrolments" },
        { label: "Add Course", to: "/admin/courses/create" },
      ],
    },
    {
      label: "Units",
      icon: BookOpen,
      children: [
        { label: "All Units", to: "/admin/units" },
        { label: "Add Unit", to: "/admin/units/create" },
      ],
    },
    {
      label: "Academic Calendar",
      icon: CalendarClock,
      children: [
        { label: "Academic Years", to: "/admin/academic-calendar/years" },
        { label: "Add Academic Year", to: "/admin/academic-calendar/years/create" },
        { label: "Academic Sessions", to: "/admin/academic-calendar/sessions" },
        { label: "Add Session", to: "/admin/academic-calendar/sessions/create" },
        { label: "School Calendar", to: "/admin/academic-calendar/calendar" },
      ],
    },
    {
      label: "Timetables",
      icon: CalendarClock,
      defaultOpen: true,
      children: [
        { label: "View Timetables", to: "/admin/timetables" },
        { label: "Add Timetable", to: "/admin/timetables/create" },
        { label: "Lecture Rooms", to: "/admin/lecture-rooms" },
        { label: "Class Attendance", to: "/admin/attendance" },
      ],
    },
    {
      label: "Assessments",
      icon: ClipboardCheck,
      children: [
        { label: "View Marks", to: "/admin/assessments" },
        { label: "Add Marks", to: "/admin/assessments/add" },
        { label: "Publish Marks", to: "/admin/assessments/publish" },
        { label: "Transcript", to: "/admin/assessments/transcript" },
      ],
    },
    {
      label: "Analytics",
      icon: BarChart3,
      children: [{ label: "Reporting Dashboard", to: "/admin/analytics" }],
    },
    {
      label: "Students",
      icon: GraduationCap,
      children: [
        { label: "Student Registry", to: "/admin/students" },
        { label: "Admissions", to: "/admin/students/create" },
        { label: "Course Change", to: "/admin/students/course-change" },
        { label: "Transfer History", to: "/admin/students/transfers" },
      ],
    },
    {
      label: "Finance",
      icon: Landmark,
      children: [
        { label: "Dashboard", to: "/admin/finance/dashboard" },
        { label: "Fee Reports", to: "/admin/finance/reports" },
        { label: "Billing", to: "/admin/finance/billing" },
        { label: "Invoices", to: "/admin/finance/invoices" },
        { label: "Payments", to: "/admin/finance/payments" },
        { label: "Statements", to: "/admin/finance/statement" },
        { label: "Financial Ledger", to: "/admin/finance/ledger" },
        { label: "Fee Templates", to: "/admin/finance/fee-templates" },
        { label: "Add Template", to: "/admin/finance/fee-templates/create" },
      ],
    },
    {
      label: "Hostels",
      icon: Building2,
      children: [
        { label: "Manage Hostels", to: "/admin/hostels" },
        { label: "Add Hostel", to: "/admin/hostels/create" },
        { label: "Allocations", to: "/admin/hostel-allocations" },
      ],
    },
    {
      label: "Operations",
      icon: Settings2,
      children: [
        { label: "Enrollments", to: "/admin/operations/enrollments" },
        { label: "Status Logs", to: "/admin/operations/status-logs" },
      ],
    },
    {
      label: "System Config",
      icon: Settings2,
      children: [
        { label: "System Configurations", to: "/admin/system-configurations" },
      ],
    },
    {
      label: "Support",
      icon: ArrowRightLeft,
      children: [
        { label: "Support Requests", to: "/admin/support-requests" },
      ],
    },
    {
      label: "Access",
      icon: ShieldCheck,
      children: [
        { label: "Roles", to: "/admin/access-roles" },
        { label: "Add Role", to: "/admin/access-roles/create" },
      ],
    },
  ],
  trainer: [
    { label: "Dashboard", to: dashboardPathByRole.trainer, icon: LayoutDashboard },
    {
      label: "Courses & Units",
      icon: BookOpen,
      children: [{ label: "My Units", to: "/trainer/my-units" }],
    },
    {
      label: "Timetables",
      icon: CalendarClock,
      children: [
        { label: "View Timetables", to: "/trainer/timetables" },
        { label: "Class Attendance", to: "/trainer/attendance" },
      ],
    },
    {
      label: "Assessments",
      icon: ClipboardCheck,
      children: [{ label: "View Marks", to: "/trainer/assessments" }],
    },
    {
      label: "Analytics",
      icon: BarChart3,
      children: [{ label: "Reports", to: "/trainer/reports" }],
    },
    {
      label: "Students",
      icon: Users,
      children: [{ label: "Learners", to: "/trainer/learners" }],
    },
    {
      label: "Operations",
      icon: Settings2,
      children: [{ label: "Operations Hub", to: "/trainer/operations" }],
    },
  ],
  student: [
    { label: "Dashboard", to: "/student", icon: LayoutDashboard },
    {
      label: "Courses & Units",
      icon: BookOpen,
      children: [
        { label: "My Courses", to: "/student/my-courses" },
        { label: "My Units", to: "/student/my-units" },
      ],
    },
    {
      label: "Timetables",
      icon: CalendarClock,
      children: [{ label: "View Timetables", to: "/student/timetables" }],
    },
    {
      label: "Assessments",
      icon: ClipboardCheck,
      children: [
        { label: "Marksheet", to: "/student/assessments/marksheet" },
        { label: "Transcript", to: "/student/assessments/transcript" },
      ],
    },
    {
      label: "Analytics",
      icon: BarChart3,
      children: [{ label: "Reports", to: "/student/reports" }],
    },
    {
      label: "Finance",
      icon: Coins,
      children: [{ label: "Fee Statements", to: "/student/finance/statements" }],
    },
    {
      label: "Support",
      icon: ArrowRightLeft,
      children: [
        { label: "My Requests", to: "/student/support-requests" },
        { label: "Submit Request", to: "/student/support-requests/create" },
      ],
    },
    {
      label: "Hostel",
      icon: Building2,
      children: [{ label: "My Hostel", to: "/student/hostel" }],
    },
    {
      label: "Institution",
      icon: School,
      children: [{ label: "School Info", to: "/student/school-info" }],
    },
  ],
};

export function getSidebarLinks(role) {
  return sidebarNavigationByRole[role] ?? sidebarNavigationByRole.student;
}

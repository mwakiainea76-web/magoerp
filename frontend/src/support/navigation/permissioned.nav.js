import { ArrowLeftToLine, ArrowRightLeft, Award, Banknote, BookOpen, Building2, CalendarClock, ClipboardCheck, Coins, FileText, GraduationCap, Landmark, LayoutDashboard, Settings2, ShieldCheck, TrendingUp, Users, Wallet } from "lucide-react";
import { dashboardPathByRole } from "@/support/dashboardPaths";

export const navLinks = [
  {
    label: "Admin Dashboard",
    to: dashboardPathByRole.admin,
    icon: LayoutDashboard,
  },
  {
    label: "Staff",
    icon: Users,
    children: [
      { label: "Staff Directory", to: "/admin/staffs", permission: "manage-staff" },
      { label: "Add Staff", to: "/admin/staffs/create", permission: "manage-staff" },
      { label: "Reset Password", to: "/admin/staffs/reset-password", permission: "manage-staff" },
      { label: "Status Logs", to: "/admin/staffs/status-logs", permission: "manage-staff" },
    ],
  },
  {
    label: "Department",
    icon: Building2,

    children: [
      { label: "View Departments", to: "/admin/departments", permission: "manage-departments" },
      { label: "Add Department", to: "/admin/departments/create", permission: "manage-departments" },
    ],
  },
  {
    label: "Certification Authority",
    icon: Award,

    children: [
      { label: "View Authorities", to: "/admin/certification-authorities", permission: "manage-certification-authorities" },
      { label: "Add Authority", to: "/admin/certification-authorities/create", permission: "manage-certification-authorities" },
      { label: "View Levels", to: "/admin/certification-levels", permission: "manage-certification-authorities" },
      { label: "Add Level", to: "/admin/certification-levels/create", permission: "manage-certification-authorities" },
    ],
  },
  {
    label: "Curriculums",
    icon: BookOpen,

    children: [
      { label: "All Curriculums", to: "/admin/curriculums", permission: "manage-curriculums" },
      { label: "Add Curriculum", to: "/admin/curriculums/create", permission: "manage-curriculums" },
      { label: "Course Mappings", to: "/admin/curriculums/mappings", permission: "manage-curriculums" },
    ],
  },
  {
    label: "Courses",
    icon: GraduationCap,

    children: [
      { label: "All Courses", to: "/admin/courses", permission: "manage-courses" },
      { label: "Course Enrolments", to: "/admin/courses/enrolments", permission: "manage-courses" },
      { label: "Add Course", to: "/admin/courses/create", permission: "manage-courses" },
      { label: "Course Change", to: "/admin/courses/course-change", permission: "manage-course-changes" },
      { label: "Transfer History", to: "/admin/courses/transfers", permission: "manage-course-changes" },
    ],
  },
  {
    label: "Units",
    icon: BookOpen,

    children: [
      { label: "All Units", to: "/admin/units", permission: "manage-units" },
      { label: "Add Unit", to: "/admin/units/create", permission: "manage-units" },
    ],
  },
  {
    label: "Academic Calendar",
    icon: CalendarClock,

    children: [
      { label: "Academic Years", to: "/admin/academic-calendar/years", permission: "manage-academic-years" },
      { label: "Add Academic Year", to: "/admin/academic-calendar/years/create", permission: "manage-academic-years" },
      { label: "Academic Sessions", to: "/admin/academic-calendar/sessions", permission: "manage-academic-sessions" },
      { label: "Add Session", to: "/admin/academic-calendar/sessions/create", permission: "manage-academic-sessions" },
      { label: "School Calendar", to: "/admin/academic-calendar/calendar", permission: "manage-academic-years" },
    ],
  },
  {
    label: "Timetables",
    icon: CalendarClock,
    defaultOpen: true,

    children: [
      { label: "View Timetables", to: "/admin/timetables", permission: "manage-timetables" },
      { label: "Add Timetable", to: "/admin/timetables/create", permission: "manage-timetables" },
      { label: "Lecture Rooms", to: "/admin/lecture-rooms", permission: "manage-lecture-rooms" },
      { label: "Class Attendance", to: "/admin/attendance", permission: "manage-attendance" },
    ],
  },
  {
    label: "Assessments",
    icon: ClipboardCheck,

    children: [
      { label: "View Marks", to: "/admin/assessments", permission: "manage-assessments" },
      { label: "Add Marks", to: "/admin/assessments/add", permission: "manage-assessments" },
      { label: "Publish Marks", to: "/admin/assessments/publish", permission: "manage-assessments" },
      { label: "Transcript", to: "/admin/assessments/transcript", permission: "manage-assessments" },
    ],
  },
  {
    label: "Students",
    icon: GraduationCap,

    children: [
      { label: "Student Registry", to: "/admin/students", permission: "manage-students" },
      { label: "Admissions", to: "/admin/students/create", permission: "manage-students" },
      { label: "Reset Password", to: "/admin/students/reset-password", permission: "manage-students" },
      { label: "Status Logs", to: "/admin/students/status-logs", permission: "manage-students" },
    ],
  },
  {
    label: "Hostels",
    icon: Building2,

    children: [
      { label: "Manage Hostels", to: "/admin/hostels", permission: "manage-hostels" },
      { label: "Add Hostel", to: "/admin/hostels/create", permission: "manage-hostels" },
      { label: "Allocations", to: "/admin/hostel-allocations", permission: "manage-hostel-allocations" },
    ],
  },
  {
    label: "Operations",
    icon: Settings2,

    children: [
      { label: "Enrollments", to: "/admin/operations/enrollments", permission: "manage-enrollments" },
    ],
  },
  {
    label: "System Config",
    icon: Settings2,

    children: [
      { label: "System Configurations", to: "/admin/system-configurations", permission: "manage-system-configurations" },
      { label: "Institution Details", to: "/admin/institution-details", permission: "manage-institution-details" },
    ],
  },
  {
    label: "Support",
    icon: ArrowRightLeft,

    children: [
      { label: "Support Requests", to: "/admin/support-requests", permission: "manage-support-requests" },
    ],
  },
  {
    label: "Access",
    icon: ShieldCheck,

    children: [
      { label: "Roles", to: "/admin/access-roles", permission: "manage-roles" },
      { label: "Add Role", to: "/admin/access-roles/create", permission: "manage-roles" },
    ],
  },
  {
    label: "Finance Dashboard",
    to: "/finance/overview",
    icon: Landmark,
    permission: "finance.view",
  },
  {
    label: "Fee Management",
    icon: BookOpen,
    children: [
      { label: "Fee Structures", to: "/finance/fee-structures", permission: "finance.view" },
      { label: "Create Fee Structure", to: "/finance/fee-structures/create", permission: "finance.view" },
      { label: "Course Fee", to: "/finance/course-fee", permission: "finance.view" },
      { label: "Fee Assignments", to: "/finance/fee-assignments", permission: "finance.view" },
    ],
  },
  {
    label: "Invoicing",
    icon: FileText,
    children: [
      { label: "Issue Invoice", to: "/finance/invoices/issue", permission: "finance.view" },
      { label: "Cohort Billing", to: "/finance/cohort-billing", permission: "finance.view" },
      { label: "Not Invoiced", to: "/finance/students-not-invoiced", permission: "finance.view" },
    ],
  },
  {
    label: "Payments",
    to: "/finance/actions",
    icon: Wallet,
    permission: "finance.view",
  },
  {
    label: "Student Statement",
    to: "/finance/statement",
    icon: Banknote,
    permission: "finance.view",
  },
  {
    label: "Reports",
    to: "/finance/reports",
    icon: TrendingUp,
    permission: "finance.view",
  },
  {
    label: "Administration",
    icon: Settings2,

    children: [
      { label: "Finance Health", to: "/finance/health", permission: "finance.view" },
      { label: "Readiness", to: "/finance/readiness", permission: "finance.view" },
      { label: "Settings", to: "/finance/settings", permission: "finance.view" },
    ],
  },
  {
    label: "Back to Admin",
    to: "/admin/dashboard",
    icon: ArrowLeftToLine,
  },
  {
    label: "Dashboard",
    to: dashboardPathByRole.trainer,
    icon: LayoutDashboard,
  },
  {
    label: "Timetables",
    icon: CalendarClock,
    children: [
      { label: "Class Attendance", to: "/trainer/attendance", permission: "manage-attendance" },
    ],
  },
  {
    label: "Dashboard",
    to: "/student",
    icon: LayoutDashboard,
  },
  {
    label: "Courses & Units",
    icon: BookOpen,
    children: [
      { label: "My Units", to: "/student/my-units" },
    ],
  },
  {
    label: "Timetables",
    icon: CalendarClock,
    children: [
      { label: "View Timetables", to: "/student/timetables" },
    ],
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
    label: "Finance",
    icon: Coins,
    children: [
      { label: "Fee Statements", to: "/student/finance/statements", permission: "view-financial-statements" },
    ],
  },
  {
    label: "Support",
    icon: ArrowRightLeft,
    children: [
      { label: "My Requests", to: "/student/support-requests", permission: "manage-support-requests" },
      { label: "Submit Request", to: "/student/support-requests/create", permission: "manage-support-requests" },
    ],
  },
  {
    label: "Hostel",
    icon: Building2,
    children: [
      { label: "My Hostel", to: "/student/hostel" },
    ],
  },
];

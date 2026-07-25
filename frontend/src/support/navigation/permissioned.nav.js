import { ArrowRightLeft, BookOpen, Building2, CalendarClock, ClipboardCheck, Coins, Landmark, LayoutDashboard, Settings2, Users } from "lucide-react";

export const navLinks = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    permission: "dashboard.view",
  },
  {
    label: "People",
    icon: Users,
    children: [
      { label: "Staff", to: "/staffs", permission: "manage-staff" },
      { label: "Students", to: "/students", permission: "manage-students" },
    ],
  },
  {
    label: "Academic Setup",
    icon: BookOpen,
    children: [
      { label: "Departments", to: "/departments", permission: "manage-departments" },
      { label: "Certification", to: "/certification-authorities", permission: "manage-certification-authorities" },
      { label: "Curriculum", to: "/curriculums", permission: "manage-curriculums" },
      { label: "Courses", to: "/courses", permission: "manage-courses" },
      { label: "Units", to: "/units", permission: "manage-units" },
      { label: "My Units", to: "/student/my-units", permission: "my-units.view" },
    ],
  },
  {
    label: "Calendar & Classes",
    icon: CalendarClock,
    children: [
      { label: "Academic Calendar", to: "/academic-calendar/years", permission: "manage-academic-years" },
      { label: "Timetables", to: "/timetables", permission: "timetables.view" },
      { label: "Lecture Rooms", to: "/lecture-rooms", permission: "manage-lecture-rooms" },
      { label: "Attendance", to: "/attendance", permission: "manage-attendance" },
    ],
  },
  {
    label: "Assessments",
    icon: ClipboardCheck,
    children: [
      { label: "Assessments", to: "/assessments", permission: "assessments.view" },
      { label: "Marksheet", to: "/assessments/marksheet", permission: "assessments.view" },
      { label: "Transcript", to: "/assessments/transcript", permission: "assessments.view" },
      { label: "Exam Series", to: "/exam-series", permission: "manage-exam-series" },
    ],
  },
  {
    label: "Finance",
    icon: Landmark,
    children: [
      { label: "Dashboard", to: "/finance/overview", permission: "finance.view" },
      { groupLabel: "Fees", permission: "finance.view" },
      { label: "Fee Structures", to: "/finance/fee-structures", permission: "finance.view" },
      { label: "Create Fee Structure", to: "/finance/fee-structures/create", permission: "finance.view" },
      { label: "Course Fee", to: "/finance/course-fee", permission: "finance.view" },
      { label: "Fee Assignments", to: "/finance/fee-assignments", permission: "finance.view" },
      { groupLabel: "Billing", permission: "finance.view" },
      { label: "Issue Invoice", to: "/finance/invoices/issue", permission: "finance.view" },
      { label: "Cohort Billing", to: "/finance/cohort-billing", permission: "finance.view" },
      { label: "Not Invoiced", to: "/finance/students-not-invoiced", permission: "finance.view" },
      { label: "Payments", to: "/finance/actions", permission: "finance.view" },
      { label: "Student Statement", to: "/finance/statement", permission: "finance.view" },
      { groupLabel: "Reports & Admin", permission: "finance.view" },
      { label: "Reports", to: "/finance/reports", permission: "finance.view" },
      { label: "Finance Health", to: "/finance/health", permission: "finance.view" },
      { label: "Readiness", to: "/finance/readiness", permission: "finance.view" },
      { label: "Settings", to: "/finance/settings", permission: "finance.view" },
      { label: "Fee Statements", to: "/student/finance/statements", permission: "view-financial-statements" },
    ],
  },
  {
    label: "Hostel",
    icon: Building2,
    children: [
      { label: "Hostels", to: "/hostels", permission: "manage-hostels" },
      { label: "My Hostel", to: "/student/hostel", permission: "my-hostel.view" },
    ],
  },
  {
    label: "Support",
    icon: ArrowRightLeft,
    children: [
      { label: "Support Requests", to: "/support-requests", permission: "manage-support-requests" },
      { label: "Submit Request", to: "/support-requests/create", permission: "manage-support-requests" },
    ],
  },
  {
    label: "System",
    icon: Settings2,
    children: [
      { label: "Operations", to: "/operations/enrollments", permission: "manage-enrollments" },
      { label: "Configurations", to: "/system-configurations", permission: "manage-system-configurations" },
      { label: "Institution", to: "/institution-details", permission: "manage-institution-details" },
      { label: "Roles", to: "/access-roles", permission: "manage-roles" },
    ],
  },
];

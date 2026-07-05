import { ArrowRightLeft, BookOpen, Building2, CalendarClock, ClipboardCheck, Coins, LayoutDashboard } from "lucide-react";

export const studentNav = [
  { label: "Dashboard", to: "/student", icon: LayoutDashboard },
  {
    label: "Courses & Units",
    icon: BookOpen,
    children: [{ label: "My Units", to: "/student/my-units" }],
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
];

import { CalendarClock, LayoutDashboard } from "lucide-react";
import { dashboardPathByRole } from "@/support/dashboardPaths";

export const trainerNav = [
  {
    label: "Dashboard",
    to: dashboardPathByRole.trainer,
    icon: LayoutDashboard,
  },
  {
    label: "Timetables",
    icon: CalendarClock,
    children: [{ label: "Class Attendance", to: "/trainer/attendance" }],
  },
];

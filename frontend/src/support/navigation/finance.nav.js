import { ArrowLeftToLine, Banknote, BookOpen, FileText, Landmark, Settings2, TrendingUp, Wallet } from "lucide-react";

export const financeNav = [
  {
    label: "Finance Dashboard",
    to: "/finance/overview",
    icon: Landmark,
  },
  {
    label: "Fee Management",
    icon: BookOpen,
    children: [
      { label: "Fee Structures", to: "/finance/fee-structures" },
      { label: "Create Fee Structure", to: "/finance/fee-structures/create" },
      { label: "Course Fee", to: "/finance/course-fee" },
      { label: "Fee Assignments", to: "/finance/fee-assignments" },
    ],
  },
  {
    label: "Invoicing",
    icon: FileText,
    children: [
      { label: "Issue Invoice", to: "/finance/invoices/issue" },
      { label: "Cohort Billing", to: "/finance/cohort-billing" },
      { label: "Not Invoiced", to: "/finance/students-not-invoiced" },
    ],
  },
  {
    label: "Payments",
    to: "/finance/actions",
    icon: Wallet,
  },
  {
    label: "Student Statement",
    to: "/finance/statement",
    icon: Banknote,
  },
  {
    label: "Reports",
    to: "/finance/reports",
    icon: TrendingUp,
  },
  {
    label: "Administration",
    icon: Settings2,
    children: [
      { label: "Finance Health", to: "/finance/health" },
      { label: "Readiness", to: "/finance/readiness" },
      { label: "Settings", to: "/finance/settings" },
    ],
  },
  {
    label: "Back to Admin",
    to: "/admin/dashboard",
    icon: ArrowLeftToLine,
  },
];

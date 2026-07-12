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
    icon: Wallet,
    children: [
      { label: "Record Payments", to: "/finance/actions" },
    ],
  },
  {
    label: "Accounts",
    icon: Banknote,
    children: [
      { label: "Student Accounts", to: "/finance/student-accounts" },
      { label: "Statement", to: "/finance/statement" },
      { label: "Ledger", to: "/finance/ledger" },
    ],
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

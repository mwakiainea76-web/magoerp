import { lazy } from "react";
import { Route } from "react-router";

const FinanceDashboard = lazy(() => import("@/pages/finance/FinanceDashboardPage").then((m) => ({ default: m.FinanceDashboardPage })));
const FeeStructureListPage = lazy(() => import("@/pages/finance/fee-structure/FeeStructureListPage").then((m) => ({ default: m.FeeStructureListPage })));
const FeeStructureWizardPage = lazy(() => import("@/pages/finance/fee-structure/FeeStructureWizardPage").then((m) => ({ default: m.FeeStructureWizardPage })));
const FeeStructureDetailPage = lazy(() => import("@/pages/finance/fee-structure/FeeStructureDetailPage").then((m) => ({ default: m.FeeStructureDetailPage })));
const CourseFeeAssignmentPage = lazy(() => import("@/pages/finance/CourseFeeAssignmentPage").then((m) => ({ default: m.CourseFeeAssignmentPage })));
const CourseFeeAssignPage = lazy(() => import("@/pages/finance/CourseFeeAssignPage").then((m) => ({ default: m.CourseFeeAssignPage })));
const AllFeeAssignmentsPage = lazy(() => import("@/pages/finance/fee-structure/AllFeeAssignmentsPage").then((m) => ({ default: m.AllFeeAssignmentsPage })));
const InvoiceActionsPage = lazy(() => import("@/pages/finance/fee-invoices/InvoiceActionsPage").then((m) => ({ default: m.InvoiceActionsPage })));
const CohortBillingPage = lazy(() => import("@/pages/finance/fee-invoices/CohortBillingPage").then((m) => ({ default: m.CohortBillingPage })));
const StudentsNotInvoicedPage = lazy(() => import("@/pages/finance/fee-invoices/StudentsNotInvoicedPage").then((m) => ({ default: m.StudentsNotInvoicedPage })));
const FinanceActionsPage = lazy(() => import("@/pages/finance/payment/FinanceActionsPage").then((m) => ({ default: m.FinanceActionsPage })));
const StudentFeeStatementPage = lazy(() => import("@/pages/finance/student-accounts/StudentFeeStatementPage").then((m) => ({ default: m.StudentFeeStatementPage })));
const FinanceReportsPage = lazy(() => import("@/pages/finance/FinanceReportsPage").then((m) => ({ default: m.FinanceReportsPage })));
const FinanceHealthPage = lazy(() => import("@/pages/finance/FinanceHealthPage").then((m) => ({ default: m.FinanceHealthPage })));
const FinanceReadinessPage = lazy(() => import("@/pages/finance/FinanceReadinessPage").then((m) => ({ default: m.FinanceReadinessPage })));
const FinanceSettingsPage = lazy(() => import("@/pages/finance/FinanceSettingsPage").then((m) => ({ default: m.FinanceSettingsPage })));
const FeeStructureItemsPage = lazy(() => import("@/pages/finance/fee-structure/FeeStructureItemsPage").then((m) => ({ default: m.FeeStructureItemsPage })));
const FeeStructureAssignmentsPage = lazy(() => import("@/pages/finance/fee-structure/FeeStructureAssignmentsPage").then((m) => ({ default: m.FeeStructureAssignmentsPage })));

export const FinanceRoutes = (
  <>
    <Route path="/finance/overview" element={<FinanceDashboard />} />
    <Route path="/finance/fee-structures" element={<FeeStructureListPage />} />
    <Route path="/finance/fee-structures/create" element={<FeeStructureWizardPage />} />
    <Route path="/finance/fee-structures/:templateId" element={<FeeStructureDetailPage />} />
    <Route path="/finance/fee-structures/:templateId/edit" element={<FeeStructureWizardPage />} />
    <Route path="/finance/fee-structures/:templateId/assign" element={<FeeStructureAssignmentsPage />} />
    <Route path="/finance/fee-structures/items" element={<FeeStructureItemsPage />} />
    <Route path="/finance/course-fee" element={<CourseFeeAssignmentPage />} />
    <Route path="/finance/course-fee/:templateId/assign" element={<CourseFeeAssignPage />} />
    <Route path="/finance/fee-assignments" element={<AllFeeAssignmentsPage />} />
    <Route path="/finance/invoices/issue" element={<InvoiceActionsPage />} />
    <Route path="/finance/cohort-billing" element={<CohortBillingPage />} />
    <Route path="/finance/students-not-invoiced" element={<StudentsNotInvoicedPage />} />
    <Route path="/finance/actions" element={<FinanceActionsPage />} />
    <Route path="/finance/statement" element={<StudentFeeStatementPage role="finance" />} />
    <Route path="/finance/statement/:studentId" element={<StudentFeeStatementPage role="finance" />} />
    <Route path="/finance/reports" element={<FinanceReportsPage />} />
    <Route path="/finance/health" element={<FinanceHealthPage />} />
    <Route path="/finance/readiness" element={<FinanceReadinessPage />} />
    <Route path="/finance/settings" element={<FinanceSettingsPage />} />
  </>
);

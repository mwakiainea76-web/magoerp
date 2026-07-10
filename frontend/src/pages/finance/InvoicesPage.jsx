import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Download, FileText, Filter, X } from "lucide-react";

import { initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { LookupSelect } from "@/components/LookupSelect";
import { PaginationFooter } from "@/components/PaginationFooter";
import { useInvoicesApi } from "@/hooks/useInvoicesApi";
import { useFinanceReportsApi } from "@/hooks/useFinanceReportsApi";
import { useLookupApi } from "@/hooks/useLookupApi";

const currency = (amount) =>
  `Ksh ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function StatusBadge({ status }) {
  const styles = {
    issued: "bg-blue-50 text-blue-700 border-blue-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    partial: "bg-amber-50 text-amber-700 border-amber-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${styles[status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {status}
    </span>
  );
}

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "issued", label: "Issued" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

export function InvoicesPage() {
  const navigate = useNavigate();
  const invoicesApi = useInvoicesApi();
  const reportsApi = useFinanceReportsApi();
  const lookupApi = useLookupApi();
  const [invoices, setInvoices] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  // Pending filter state (applied on Apply click)
  const [pendingStatus, setPendingStatus] = useState("all");
  const [pendingAdmission, setPendingAdmission] = useState("");
  const [pendingDept, setPendingDept] = useState(null);
  const [pendingCourse, setPendingCourse] = useState(null);
  const [pendingYear, setPendingYear] = useState(null);
  const [pendingSession, setPendingSession] = useState(null);
  const [pendingDateFrom, setPendingDateFrom] = useState("");
  const [pendingDateTo, setPendingDateTo] = useState("");

  // Active filter params sent to API
  const [activeFilters, setActiveFilters] = useState({});

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const params = { page, per_page: perPage, sort_by: "created_at", sort_direction: "desc" };
        Object.entries(activeFilters).forEach(([key, value]) => {
          if (value !== "" && value !== null && value !== "all") {
            params[key] = value;
          }
        });
        const res = await invoicesApi.list(params);
        if (isMounted) {
          setInvoices(res.data ?? []);
          setMeta(res.meta ?? initialMeta);
        }
      } catch {
        if (isMounted) { setInvoices([]); setMeta(initialMeta); }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [invoicesApi, page, perPage, activeFilters]);

  function handleApplyFilters() {
    const f = {};
    if (pendingStatus !== "all") f.status = pendingStatus;
    if (pendingAdmission.trim()) f.admission_number = pendingAdmission.trim();
    if (pendingDept) f.department_id = pendingDept;
    if (pendingCourse) f.course_id = pendingCourse;
    if (pendingYear) f.academic_year_id = pendingYear;
    if (pendingSession) f.academic_session_id = pendingSession;
    if (pendingDateFrom) f.date_from = pendingDateFrom;
    if (pendingDateTo) f.date_to = pendingDateTo;
    setActiveFilters(f);
    setPage(1);
  }

  function handleClearFilters() {
    setPendingStatus("all");
    setPendingAdmission("");
    setPendingDept(null);
    setPendingCourse(null);
    setPendingYear(null);
    setPendingSession(null);
    setPendingDateFrom("");
    setPendingDateTo("");
    setActiveFilters({});
    setPage(1);
  }

  const hasActiveFilters = Object.keys(activeFilters).length > 0;

  async function handleExport() {
    setIsExporting(true);
    try {
      const blob = await reportsApi.exportInvoices(activeFilters);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "invoices.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } finally { setIsExporting(false); }
  }

  const fetchDepartments = useCallback(
    async (query) => {
      const res = await lookupApi.search("departments", { query, limit: 10 });
      return res.data ?? [];
    }, [lookupApi],
  );

  const fetchCourses = useCallback(
    async (query) => {
      const res = await lookupApi.search("courses", { query, limit: 10, department_id: pendingDept || undefined });
      return res.data ?? [];
    }, [lookupApi, pendingDept],
  );

  const fetchAcademicYears = useCallback(
    async (query) => {
      const res = await lookupApi.search("academic-years", { query, limit: 10 });
      return res.data ?? [];
    }, [lookupApi],
  );

  const fetchAcademicSessions = useCallback(
    async (query) => {
      const res = await lookupApi.search("academic-sessions", { query, limit: 10, year_id: pendingYear || undefined });
      return res.data ?? [];
    }, [lookupApi, pendingYear],
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">Invoices</h1><p className="mt-1 text-[14px] text-slate-500">View and manage all student invoices.</p></div>
        <button type="button" onClick={handleExport} disabled={isExporting} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-700 px-4 text-sm font-medium text-white disabled:opacity-60"><Download className="size-4" />{isExporting ? "Exporting..." : "Export CSV"}</button>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="mr-1 text-[13px] font-medium text-slate-500">Filters</span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <FormInput label="Admission Number" type="text" value={pendingAdmission}
              onChange={(e) => setPendingAdmission(e.target.value)}
              placeholder="e.g. STU/0001/24" />
          </div>

          <LookupSelect
            label="Department"
            placeholder="All departments"
            value={pendingDept}
            selectedOption={null}
            onChange={(id) => {
              setPendingDept(id);
              setPendingCourse(null);
            }}
            fetchOptions={fetchDepartments}
          />

          <LookupSelect
            label="Course"
            placeholder={pendingDept ? "All courses" : "Select dept first"}
            value={pendingCourse}
            selectedOption={null}
            onChange={(id) => setPendingCourse(id)}
            fetchOptions={fetchCourses}
            disabled={!pendingDept}
          />

          <div>
            <label className="mb-0.5 block text-[11px] font-medium text-slate-400">Status</label>
            <select
              value={pendingStatus}
              onChange={(e) => setPendingStatus(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none focus:border-emerald-500"
            >
              {statusOptions.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <LookupSelect
            label="Academic Year"
            placeholder="All years"
            value={pendingYear}
            selectedOption={null}
            onChange={(id) => {
              setPendingYear(id);
              setPendingSession(null);
            }}
            fetchOptions={fetchAcademicYears}
          />

          <LookupSelect
            label="Academic Session"
            placeholder={pendingYear ? "All sessions" : "Select year first"}
            value={pendingSession}
            selectedOption={null}
            onChange={(id) => setPendingSession(id)}
            fetchOptions={fetchAcademicSessions}
            disabled={!pendingYear}
          />

          <div>
            <FormInput label="Date From" type="date" value={pendingDateFrom}
              onChange={(e) => setPendingDateFrom(e.target.value)} />
          </div>

          <div>
            <FormInput label="Date To" type="date" value={pendingDateTo}
              onChange={(e) => setPendingDateTo(e.target.value)} />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <FormButton type="button" onClick={handleApplyFilters} className="h-9">
            Apply
          </FormButton>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Invoice #</th>
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Session</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-right">Paid</th>
                <th className="px-5 py-3 text-right">Balance</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Date</th>
                <th className="w-10 px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-500">Loading invoices...</td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-slate-500">No invoices found</td>
                </tr>
              ) : invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3 font-medium text-slate-900">{inv.invoice_number}</td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="text-slate-900">{inv.student_name}</span>
                      <span className="text-[12px] text-slate-400">{inv.admission_number}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{inv.session_name ?? "-"}</td>
                  <td className="px-5 py-3 text-right">{currency(inv.amount_due)}</td>
                  <td className="px-5 py-3 text-right">{currency(inv.paid_amount)}</td>
                  <td className={`px-5 py-3 text-right font-medium ${inv.balance_due > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {currency(inv.balance_due)}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-5 py-3 text-slate-500">{inv.issue_date ?? "-"}</td>
                  <td className="px-5 py-3">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/finance/statement/${inv.student_id}`)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-emerald-600"
                      title="View statement"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && invoices.length > 0 ? (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <PaginationFooter
              page={page}
              perPage={perPage}
              total={meta.total}
              lastPage={meta.last_page}
              onPageChange={setPage}
              onPerPageChange={setPerPage}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

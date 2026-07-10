import { useCallback, useEffect, useState } from "react";
import { Download, Filter, X, ChevronDown } from "lucide-react";

import { initialMeta } from "@/lib/styles";
import { FormInput } from "@/components/FormInput";
import { LookupSelect } from "@/components/LookupSelect";
import { PaginationFooter } from "@/components/PaginationFooter";
import { usePaymentsApi } from "@/hooks/usePaymentsApi";
import { useFinanceReportsApi } from "@/hooks/useFinanceReportsApi";
import { useLookupApi } from "@/hooks/useLookupApi";

const currency = (amount) =>
  `Ksh ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const statusBadgeStyles = {
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-sky-50 text-sky-700 border-sky-200",
  reversed: "bg-slate-50 text-slate-600 border-slate-200",
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${statusBadgeStyles[status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {status}
    </span>
  );
}

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "completed", label: "Completed" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
  { value: "reversed", label: "Reversed" },
];

export function PaymentsPage() {
  const paymentsApi = usePaymentsApi();
  const reportsApi = useFinanceReportsApi();
  const lookupApi = useLookupApi();
  const [payments, setPayments] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  const [pendingStatus, setPendingStatus] = useState("all");
  const [pendingAdmission, setPendingAdmission] = useState("");
  const [pendingDept, setPendingDept] = useState(null);
  const [pendingCourse, setPendingCourse] = useState(null);
  const [pendingYear, setPendingYear] = useState(null);
  const [pendingSession, setPendingSession] = useState(null);
  const [pendingDateFrom, setPendingDateFrom] = useState("");
  const [pendingDateTo, setPendingDateTo] = useState("");

  const [activeFilters, setActiveFilters] = useState({});

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const params = { page, per_page: perPage };
        Object.entries(activeFilters).forEach(([key, value]) => {
          if (value !== "" && value !== null && value !== "all") {
            params[key] = value;
          }
        });
        const res = await paymentsApi.list(params);
        if (isMounted) {
          setPayments(res.data ?? []);
          setMeta(res.meta ?? initialMeta);
        }
      } catch {
        if (isMounted) { setPayments([]); setMeta(initialMeta); }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [paymentsApi, page, perPage, activeFilters]);

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
    setShowFilters(false);
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
    setShowFilters(false);
  }

  const activeFilterCount = Object.keys(activeFilters).length;

  async function handleExport() {
    setIsExporting(true);
    try {
      const blob = await reportsApi.exportPayments(activeFilters);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "payments.csv";
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

  const totalCollected = Array.isArray(payments) ? payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) : 0;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Payments</h1>
          <p className="mt-1 text-sm text-slate-500">View all student payments recorded in the system.</p>
        </div>
        <button type="button" onClick={handleExport} disabled={isExporting || isLoading}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-700 px-4 text-sm font-medium text-white disabled:opacity-60">
          <Download className="size-4" />{isExporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      {/* Filter bar */}
      <form onSubmit={(e) => { e.preventDefault(); handleApplyFilters(); }} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 p-3">
          <div className="flex-1">
            <FormInput label="Admission Number" value={pendingAdmission} onChange={(e) => setPendingAdmission(e.target.value)}
              placeholder="Admission No." />
          </div>
          <button type="button" onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition ${
              showFilters || activeFilterCount > 0
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}>
            <Filter className="size-4" />
            Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
          <button className="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700">
            Apply
          </button>
          {activeFilterCount > 0 && (
            <button type="button" onClick={handleClearFilters}
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50">
              <X className="size-4" />Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="border-t border-slate-100 px-3 pb-4 pt-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <LookupSelect label="Department" placeholder="All departments" value={pendingDept} selectedOption={null} onChange={(id) => { setPendingDept(id); setPendingCourse(null); }} fetchOptions={fetchDepartments} />
              <LookupSelect label="Course" placeholder={pendingDept ? "All courses" : "Select dept first"} value={pendingCourse} selectedOption={null} onChange={(id) => setPendingCourse(id)} fetchOptions={fetchCourses} disabled={!pendingDept} />
              <label className="text-xs font-medium text-slate-600">Status
                <select value={pendingStatus} onChange={(e) => setPendingStatus(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500">
                  {statusOptions.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </label>
              <LookupSelect label="Academic Year" placeholder="All years" value={pendingYear} selectedOption={null} onChange={(id) => { setPendingYear(id); setPendingSession(null); }} fetchOptions={fetchAcademicYears} />
              <LookupSelect label="Academic Session" placeholder={pendingYear ? "All sessions" : "Select year first"} value={pendingSession} selectedOption={null} onChange={(id) => setPendingSession(id)} fetchOptions={fetchAcademicSessions} disabled={!pendingYear} />
              <FormInput label="Date From" type="date" value={pendingDateFrom} onChange={(e) => setPendingDateFrom(e.target.value)} />
              <FormInput label="Date To" type="date" value={pendingDateTo} onChange={(e) => setPendingDateTo(e.target.value)} />
            </div>
          </div>
        )}
      </form>

      {/* Table */}
      <div>
        <div className="flex items-baseline justify-between px-1 pb-2">
          <h2 className="text-sm font-semibold text-slate-900">Payments</h2>
          {!isLoading && payments.length > 0 && (
            <span className="text-sm text-slate-700">
              <span className="text-xs text-slate-400">collected: </span>
              <span className="font-semibold">{currency(totalCollected)}</span>
            </span>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Student</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Method</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Reference</th>
                <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                      Loading payments...
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">No payments recorded yet.</td>
                </tr>
              ) : payments.map((payment) => (
                <tr key={payment.id} className="border-b border-slate-100 last:border-b-0">
                  <td className="whitespace-nowrap px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">{payment.student_name}</span>
                      <span className="text-xs text-slate-400">{payment.admission_number}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{payment.payment_date ?? "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{payment.method ?? "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{payment.reference ?? "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-700">{currency(payment.amount)}</td>
                  <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={payment.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && meta.total > 0 && (
            <div className="border-t border-slate-100 px-4 py-2">
              <PaginationFooter page={page} perPage={perPage} total={meta.total} lastPage={meta.last_page} onPageChange={setPage} onPerPageChange={setPerPage} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Filter, X } from "lucide-react";

import { initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { LookupSelect } from "@/components/LookupSelect";
import { PaginationFooter } from "@/components/PaginationFooter";
import { usePaymentsApi } from "@/hooks/usePaymentsApi";
import { useLookupApi } from "@/hooks/useLookupApi";

const currency = (amount) =>
  `Ksh ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function StatusBadge({ status }) {
  const styles = {
    completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    failed: "bg-red-50 text-red-700 border-red-200",
    refunded: "bg-sky-50 text-sky-700 border-sky-200",
  };
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${styles[status] ?? "bg-slate-50 text-slate-600 border-slate-200"}`}>
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
];

export function PaymentsPage() {
  const paymentsApi = usePaymentsApi();
  const lookupApi = useLookupApi();
  const [payments, setPayments] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
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
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">Payments</h1>
        <p className="mt-1 text-[14px] text-slate-500">View all student payments recorded in the system.</p>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="mr-1 text-[13px] font-medium text-slate-500">Filters</span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <label className="mb-0.5 block text-[11px] font-medium text-slate-400">Admission No.</label>
            <input
              type="text"
              value={pendingAdmission}
              onChange={(e) => setPendingAdmission(e.target.value)}
              placeholder="e.g. STU/0001/24"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition placeholder:text-[13px] placeholder:text-[#a8b6c7] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
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
            <label className="mb-0.5 block text-[11px] font-medium text-slate-400">Date From</label>
            <input
              type="date"
              value={pendingDateFrom}
              onChange={(e) => setPendingDateFrom(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="mb-0.5 block text-[11px] font-medium text-slate-400">Date To</label>
            <input
              type="date"
              value={pendingDateTo}
              onChange={(e) => setPendingDateTo(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
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
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Method</th>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">Loading payments...</td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">No payments recorded yet.</td>
                </tr>
              ) : payments.map((payment) => (
                <tr key={payment.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{payment.student_name}</span>
                      <span className="text-xs text-slate-400">{payment.admission_number}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{payment.payment_date ?? "-"}</td>
                  <td className="px-5 py-3 text-slate-600">{payment.method ?? "-"}</td>
                  <td className="px-5 py-3 text-slate-600">{payment.reference ?? "-"}</td>
                  <td className="px-5 py-3 text-right font-semibold">{currency(payment.amount)}</td>
                  <td className="px-5 py-3"><StatusBadge status={payment.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && payments.length > 0 ? (
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

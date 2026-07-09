import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Filter, Search, X, ChevronDown } from "lucide-react";

import { LookupSelect } from "@/components/LookupSelect";
import { PaginationFooter } from "@/components/PaginationFooter";
import { initialMeta } from "@/lib/styles";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { useAcademicYearsApi } from "@/hooks/useAcademicYearsApi";
import { useFinanceReportsApi } from "@/hooks/useFinanceReportsApi";
import { useLookupApi } from "@/hooks/useLookupApi";

const primaryReports = [
  ["debtors", "Fee Balance"],
  ["collections", "Payments"],
  ["credits", "Credit Balances"],
];

const secondaryReports = [
  ["penalties", "Penalties"],
  ["refunds", "Refunds"],
  ["hostel", "Hostel"],
];

const moneyKeys = new Set([
  "total_invoiced", "balance", "credit", "signed_balance", "invoiced", "collected",
  "outstanding", "amount",
]);
const money = (value) => `Ksh ${Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function FinanceReportsPage() {
  const reportsApi = useFinanceReportsApi();
  const lookupApi = useLookupApi();
  const yearsApi = useAcademicYearsApi();
  const sessionsApi = useAcademicSessionsApi();
  const [reportType, setReportType] = useState("debtors");
  const [pending, setPending] = useState({ q: "", department_id: "", course_id: "", academic_year_id: "", academic_session_id: "", date_from: "", date_to: "" });
  const [filters, setFilters] = useState({});
  const [years, setYears] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState({});
  const [summary, setSummary] = useState({});
  const [meta, setMeta] = useState(initialMeta);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    Promise.all([
      yearsApi.list({ per_page: 100 }),
      sessionsApi.list({ per_page: 100, status: "all", sort_by: "start_date", sort_direction: "desc" }),
    ]).then(([yearResponse, sessionResponse]) => {
      setYears(yearResponse.data ?? []);
      setSessions(sessionResponse.data ?? []);
    }).catch(() => {});
  }, [sessionsApi, yearsApi]);

  useEffect(() => {
    function handleClick(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const params = useMemo(() => ({
    report_type: reportType,
    page,
    per_page: perPage,
    ...filters,
  }), [filters, page, perPage, reportType]);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    reportsApi.list(params)
      .then((response) => {
        if (!active) return;
        setRows(response.data ?? []);
        setColumns(response.columns ?? {});
        setSummary(response.summary ?? {});
        setMeta(response.meta ?? initialMeta);
      })
      .catch(() => {
        if (!active) return;
        setRows([]);
        setColumns({});
        setSummary({});
        setMeta(initialMeta);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params, reportsApi]);

  const fetchDepartments = useCallback(async (query) => {
    const response = await lookupApi.search("departments", { query, limit: 10 });
    return response.data ?? [];
  }, [lookupApi]);
  const fetchCourses = useCallback(async (query) => {
    const response = await lookupApi.search("courses", { query, limit: 10, department_id: pending.department_id || undefined });
    return response.data ?? [];
  }, [lookupApi, pending.department_id]);

  function update(name, value) {
    setPending((current) => ({
      ...current,
      [name]: value,
      ...(name === "department_id" ? { course_id: "" } : {}),
      ...(name === "academic_year_id" ? { academic_session_id: "" } : {}),
    }));
  }
  function applyFilters(event) {
    event.preventDefault();
    setFilters(Object.fromEntries(Object.entries(pending).filter(([, value]) => value)));
    setPage(1);
    setShowFilters(false);
  }
  function clearFilters() {
    const clean = { q: "", department_id: "", course_id: "", academic_year_id: "", academic_session_id: "", date_from: "", date_to: "" };
    setPending(clean);
    setFilters({});
    setPage(1);
    setShowFilters(false);
  }
  async function exportCsv() {
    setExporting(true);
    try {
      const blob = await reportsApi.exportReport({ report_type: reportType, ...filters });
      downloadBlob(blob, `finance-${reportType}.csv`);
    } finally {
      setExporting(false);
    }
  }
  function renderValue(key, value) {
    if (value === null || value === undefined || value === "") return "-";
    if (moneyKeys.has(key)) return money(value);
    if (key === "collection_rate") return `${Number(value).toFixed(1)}%`;
    return String(value);
  }

  function selectReport(value) {
    setReportType(value);
    setPage(1);
    setMoreOpen(false);
  }

  const visibleSessions = pending.academic_year_id
    ? sessions.filter((session) => session.academic_year_id === pending.academic_year_id)
    : sessions;

  const activeFilterCount = Object.keys(filters).filter(k => k !== "q" && filters[k]).length;

  const labelLookup = Object.fromEntries([...primaryReports, ...secondaryReports]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Fee Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Operational, management, credit, penalty, refund and hostel reports.</p>
        </div>
        <button type="button" onClick={exportCsv} disabled={exporting || loading}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-700 px-4 text-sm font-medium text-white disabled:opacity-60">
          <Download className="size-4" />{exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-slate-200">
        {primaryReports.map(([value, label]) => (
          <button key={value} type="button" onClick={() => selectReport(value)}
            className={`relative px-4 py-2.5 text-sm font-medium transition ${
              reportType === value
                ? "text-emerald-700 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-emerald-600"
                : "text-slate-500 hover:text-slate-700"
            }`}>
            {label}
          </button>
        ))}
        <div ref={moreRef} className="relative">
          <button type="button" onClick={() => setMoreOpen(!moreOpen)}
            className={`flex items-center gap-1 px-4 py-2.5 text-sm font-medium transition ${
              secondaryReports.some(r => r[0] === reportType)
                ? "text-emerald-700 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-emerald-600"
                : "text-slate-500 hover:text-slate-700"
            }`}>
            More reports <ChevronDown className="size-3.5" />
          </button>
          {moreOpen && (
            <div className="absolute right-0 z-20 mt-1 min-w-48 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              {secondaryReports.map(([value, label]) => (
                <button key={value} type="button" onClick={() => selectReport(value)}
                  className={`flex w-full px-4 py-2 text-left text-sm transition ${
                    reportType === value ? "bg-emerald-50 text-emerald-700 font-medium" : "text-slate-600 hover:bg-slate-50"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <form onSubmit={applyFilters} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 p-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input value={pending.q} onChange={(e) => update("q", e.target.value)}
              placeholder="Student, admission or invoice"
              className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-emerald-500" />
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
          {Object.keys(filters).length > 0 && (
            <button type="button" onClick={clearFilters}
              className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-600 hover:bg-slate-50">
              <X className="size-4" />Clear
            </button>
          )}
        </div>

        {showFilters && (
          <div className="border-t border-slate-100 px-3 pb-4 pt-3">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <LookupSelect label="Department" placeholder="All departments" value={pending.department_id} onChange={(id) => update("department_id", id ?? "")} fetchOptions={fetchDepartments} />
              <LookupSelect label="Course" placeholder={pending.department_id ? "All courses" : "Select department first"} value={pending.course_id} onChange={(id) => update("course_id", id ?? "")} fetchOptions={fetchCourses} disabled={!pending.department_id} />
              <label className="text-xs font-medium text-slate-600">Academic year
                <select value={pending.academic_year_id} onChange={(e) => update("academic_year_id", e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500">
                  <option value="">All years</option>
                  {years.map((year) => <option key={year.id} value={year.id}>{year.name ?? year.code}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">Academic session
                <select value={pending.academic_session_id} onChange={(e) => update("academic_session_id", e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500">
                  <option value="">All sessions</option>
                  {visibleSessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">From date
                <input type="date" value={pending.date_from} onChange={(e) => update("date_from", e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500" />
              </label>
              <label className="text-xs font-medium text-slate-600">To date
                <input type="date" value={pending.date_to} onChange={(e) => update("date_to", e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500" />
              </label>
            </div>
          </div>
        )}
      </form>

      {/* Table */}
      <div>
        {/* Table header row with report title + summary */}
        <div className="flex items-baseline justify-between px-1 pb-2">
          <h2 className="text-sm font-semibold text-slate-900">
            {labelLookup[reportType] || reportType}
          </h2>
          {Object.keys(summary).length > 0 && (
            <div className="flex gap-4">
              {Object.entries(summary).map(([key, value]) => (
                <span key={key} className="text-sm text-slate-700">
                  <span className="text-xs text-slate-400">{key.replaceAll("_", " ")}: </span>
                  <span className="font-semibold">
                    {typeof value === "number" ? (key.includes("rate") || key === "changes" ? value : money(value)) : String(value)}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {Object.entries(columns).map(([key, label]) => (
                  <th key={key} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={Math.max(1, Object.keys(columns).length)} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
                      Loading report...
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(1, Object.keys(columns).length)} className="px-4 py-12 text-center text-slate-500">
                    No records match these filters.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id ?? `${reportType}-${index}`} className="border-b border-slate-100 last:border-b-0">
                    {Object.keys(columns).map((key) => (
                      <td key={key} className="whitespace-nowrap px-4 py-3 text-slate-700">{renderValue(key, row[key])}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!loading && meta.total > 0 && (
            <div className="border-t border-slate-100 px-4 py-2">
              <PaginationFooter page={page} perPage={perPage} total={meta.total} lastPage={meta.last_page} onPageChange={setPage} onPerPageChange={setPerPage} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default FinanceReportsPage;

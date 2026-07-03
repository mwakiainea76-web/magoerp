import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Filter, Search, X } from "lucide-react";

import { LookupSelect } from "@/components/LookupSelect";
import { PaginationFooter } from "@/components/PaginationFooter";
import { initialMeta } from "@/lib/styles";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { useAcademicYearsApi } from "@/hooks/useAcademicYearsApi";
import { useFinanceReportsApi } from "@/hooks/useFinanceReportsApi";
import { useLookupApi } from "@/hooks/useLookupApi";

const reportTypes = [
  ["debtors", "Outstanding debtors"],
  ["credits", "Student credit balances"],
  ["aging", "Receivables aging"],
  ["collections", "Collections by fee type"],
  ["adjustments", "Discounts, waivers and adjustments"],
  ["penalties", "Penalty invoices"],
  ["refunds", "Refunds"],
  ["assignment_audits", "Dormant fee edit audit"],
];
const moneyKeys = new Set([
  "total_invoiced", "balance", "credit", "signed_balance", "invoiced", "collected",
  "outstanding", "amount", "old_amount", "new_amount",
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
  const [pending, setPending] = useState({ q: "", department_id: "", course_id: "", academic_year_id: "", academic_session_id: "", date_from: "", date_to: "", adjustment_type: "" });
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

  useEffect(() => {
    Promise.all([
      yearsApi.list({ per_page: 100 }),
      sessionsApi.list({ per_page: 100, status: "all", sort_by: "start_date", sort_direction: "desc" }),
    ]).then(([yearResponse, sessionResponse]) => {
      setYears(yearResponse.data ?? []);
      setSessions(sessionResponse.data ?? []);
    }).catch(() => {});
  }, [sessionsApi, yearsApi]);

  const params = useMemo(() => ({
    report_type: reportType,
    page,
    per_page: perPage,
    ...filters,
  }), [filters, page, perPage, reportType]);

  useEffect(() => {
    let active = true;
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
  }
  function clearFilters() {
    const clean = { q: "", department_id: "", course_id: "", academic_year_id: "", academic_session_id: "", date_from: "", date_to: "", adjustment_type: "" };
    setPending(clean);
    setFilters({});
    setPage(1);
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

  const visibleSessions = pending.academic_year_id
    ? sessions.filter((session) => session.academic_year_id === pending.academic_year_id)
    : sessions;

  return <section className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-xl font-semibold text-slate-950">Fee Reports</h1><p className="mt-1 text-sm text-slate-500">Operational, management, credit, aging, adjustment and audit reports.</p></div>
      <button type="button" onClick={exportCsv} disabled={exporting || loading} className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-700 px-4 text-sm font-medium text-white disabled:opacity-60"><Download className="size-4" />{exporting ? "Exporting..." : "Export CSV"}</button>
    </div>

    <div className="flex gap-2 overflow-x-auto pb-1">
      {reportTypes.map(([value, label]) => <button key={value} type="button" onClick={() => { setReportType(value); setPage(1); }} className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm ${reportType === value ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-600"}`}>{label}</button>)}
    </div>

    <form onSubmit={applyFilters} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-600"><Filter className="size-4" />Report filters</div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="text-xs font-medium text-slate-600">Search<div className="relative mt-1"><Search className="absolute left-3 top-2.5 size-4 text-slate-400" /><input value={pending.q} onChange={(event) => update("q", event.target.value)} placeholder="Student, admission or invoice" className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm" /></div></label>
        <LookupSelect label="Department" placeholder="All departments" value={pending.department_id} onChange={(id) => update("department_id", id ?? "")} fetchOptions={fetchDepartments} />
        <LookupSelect label="Course" placeholder={pending.department_id ? "All courses" : "Select department first"} value={pending.course_id} onChange={(id) => update("course_id", id ?? "")} fetchOptions={fetchCourses} disabled={!pending.department_id} />
        <label className="text-xs font-medium text-slate-600">Academic year<select value={pending.academic_year_id} onChange={(event) => update("academic_year_id", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">All years</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name ?? year.code}</option>)}</select></label>
        <label className="text-xs font-medium text-slate-600">Academic session<select value={pending.academic_session_id} onChange={(event) => update("academic_session_id", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">All sessions</option>{visibleSessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}</select></label>
        <label className="text-xs font-medium text-slate-600">From date<input type="date" value={pending.date_from} onChange={(event) => update("date_from", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
        <label className="text-xs font-medium text-slate-600">To date<input type="date" value={pending.date_to} onChange={(event) => update("date_to", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" /></label>
        {reportType === "adjustments" && <label className="text-xs font-medium text-slate-600">Adjustment type<select value={pending.adjustment_type} onChange={(event) => update("adjustment_type", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"><option value="">All adjustments</option>{["discount", "waiver", "bursary", "helb", "reversal", "penalty"].map((type) => <option key={type} value={type}>{type}</option>)}</select></label>}
      </div>
      <div className="mt-4 flex gap-2"><button className="h-9 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white">Apply filters</button>{Object.keys(filters).length > 0 && <button type="button" onClick={clearFilters} className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-600"><X className="size-4" />Clear</button>}</div>
    </form>

    {Object.keys(summary).length > 0 && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(summary).map(([key, value]) => <div key={key} className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-xs capitalize text-slate-500">{key.replaceAll("_", " ")}</p><p className="mt-1 text-lg font-semibold text-slate-950">{typeof value === "number" ? (key.includes("rate") || key === "changes" ? value : money(value)) : String(value)}</p></div>)}</div>}

    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50"><tr>{Object.entries(columns).map(([key, label]) => <th key={key} className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={Math.max(1, Object.keys(columns).length)} className="px-4 py-12 text-center text-slate-500">Loading report...</td></tr> : rows.length === 0 ? <tr><td colSpan={Math.max(1, Object.keys(columns).length)} className="px-4 py-12 text-center text-slate-500">No records match these filters.</td></tr> : rows.map((row, index) => <tr key={row.id ?? `${reportType}-${index}`} className="border-t border-slate-100">{Object.keys(columns).map((key) => <td key={key} className="whitespace-nowrap px-4 py-3 text-slate-700">{renderValue(key, row[key])}</td>)}</tr>)}</tbody></table></div>
      {!loading && meta.total > 0 && <div className="border-t border-slate-100 px-4 py-3"><PaginationFooter page={page} perPage={perPage} total={meta.total} lastPage={meta.last_page} onPageChange={setPage} onPerPageChange={setPerPage} /></div>}
    </div>
  </section>;
}

export default FinanceReportsPage;

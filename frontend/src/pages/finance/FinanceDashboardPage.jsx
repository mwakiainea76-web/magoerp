import { useCallback, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Banknote,
  TrendingUp,
  Percent,
  BadgePercent,
  RotateCcw,
  ArrowUpRight,
  Users,
  Filter,
  X,
} from "lucide-react";

import {
  TableHeader,
  TableWrapper,
  Tbody,
  Td,
  Th,
  Thead,
} from "@/components/DataTable";
import { SearchSelect } from "@/components/SearchSelect";
import { useFinanceDashboardApi } from "@/hooks/useFinanceDashboardApi";
import { bodyTextClassName } from "@/lib/styles";

const money = (value) =>
  `Ksh ${Number(value || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent.bg} ${accent.text}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[13px] font-medium text-slate-500">{label}</span>
      </div>
      <span className="text-[22px] font-semibold tracking-tight text-slate-900">
        {value}
      </span>
      {sub ? (
        <span className="text-[12px] text-slate-400">{sub}</span>
      ) : null}
    </div>
  );
}

export function FinanceDashboardPage() {
  const api = useFinanceDashboardApi();

  // Filter state (local — only submitted on Apply)
  const [pendingDept, setPendingDept] = useState(null);
  const [pendingCourse, setPendingCourse] = useState(null);
  const [pendingYear, setPendingYear] = useState(null);
  const [pendingSession, setPendingSession] = useState(null);

  // Active filter params (sent to API)
  const [activeFilters, setActiveFilters] = useState({});

  // Filter options from API
  const [filterOptions, setFilterOptions] = useState({
    departments: [],
    courses: [],
    academic_years: [],
    sessions: [],
  });

  // Data
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(
    async (filters = {}) => {
      setLoading(true);
      setError("");

      try {
        const params = {};
        if (filters.department_id) params.department_id = filters.department_id;
        if (filters.course_id) params.course_id = filters.course_id;
        if (filters.academic_year_id)
          params.academic_year_id = filters.academic_year_id;
        if (filters.academic_session_id)
          params.academic_session_id = filters.academic_session_id;

        const res = await api.overview(params);
        setData(res.data);
        setFilterOptions(res.filters);
      } catch {
        setError("Failed to load finance data.");
      } finally {
        setLoading(false);
      }
    },
    [api],
  );

  // Initial load
  useEffect(() => {
    fetchData({});
  }, [fetchData]);

  function handleApply() {
    const filters = {};
    if (pendingDept) filters.department_id = pendingDept;
    if (pendingCourse) filters.course_id = pendingCourse;
    if (pendingYear) filters.academic_year_id = pendingYear;
    if (pendingSession) filters.academic_session_id = pendingSession;
    setActiveFilters(filters);
    fetchData(filters);
  }

  function handleClear() {
    setPendingDept(null);
    setPendingCourse(null);
    setPendingYear(null);
    setPendingSession(null);
    setActiveFilters({});
    fetchData({});
  }

  function handleDeptChange(id) {
    setPendingDept(id);
    setPendingCourse(null);
  }

  function handleCourseChange(id) {
    setPendingCourse(id);
  }

  function handleYearChange(id) {
    setPendingYear(id);
    setPendingSession(null);
  }

  function handleSessionChange(id) {
    setPendingSession(id);
  }

  const hasPendingFilters =
    pendingDept || pendingCourse || pendingYear || pendingSession;
  const hasActiveFilters =
    activeFilters.department_id ||
    activeFilters.course_id ||
    activeFilters.academic_year_id ||
    activeFilters.academic_session_id;

  if (loading && !data) {
    return (
      <section className="space-y-6">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">
          Finance Analytics
        </h1>
        <div className="grid gap-4 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-slate-100"
            />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="space-y-6">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">
          Finance Analytics
        </h1>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center text-red-600">
          {error}
        </div>
      </section>
    );
  }

  const { summary, revenue_trend, recent_payments, top_defaulters } = data;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">
          Finance Analytics
        </h1>
        <p className="mt-1 text-[14px] text-slate-500">
          Overview of revenue, collections, and outstanding balances.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="mr-1 text-[13px] font-medium text-slate-500">
            Filters
          </span>
        </div>

        <div className="min-w-[160px] flex-1">
          <label className="mb-0.5 block text-[11px] font-medium text-slate-400">
            Department
          </label>
          <SearchSelect
            placeholder="All departments"
            value={pendingDept}
            options={filterOptions.departments}
            onChange={handleDeptChange}
          />
        </div>

        <div className="min-w-[160px] flex-1">
          <label className="mb-0.5 block text-[11px] font-medium text-slate-400">
            Course
          </label>
          <SearchSelect
            placeholder={pendingDept ? "All courses" : "Select dept first"}
            value={pendingCourse}
            options={filterOptions.courses}
            onChange={handleCourseChange}
          />
        </div>

        <div className="min-w-[160px] flex-1">
          <label className="mb-0.5 block text-[11px] font-medium text-slate-400">
            Academic Year
          </label>
          <SearchSelect
            placeholder="All years"
            value={pendingYear}
            options={filterOptions.academic_years}
            onChange={handleYearChange}
          />
        </div>

        <div className="min-w-[160px] flex-1">
          <label className="mb-0.5 block text-[11px] font-medium text-slate-400">
            Session
          </label>
          <SearchSelect
            placeholder={pendingYear ? "All sessions" : "Select year first"}
            value={pendingSession}
            options={filterOptions.sessions}
            onChange={handleSessionChange}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleApply}
            className="flex h-8 items-center rounded-lg bg-emerald-600 px-4 text-[13px] font-medium text-white transition hover:bg-emerald-700"
          >
            Apply
          </button>

          {hasActiveFilters || hasPendingFilters ? (
            <button
              type="button"
              onClick={handleClear}
              className="flex h-8 items-center gap-1 rounded-lg px-3 text-[13px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-5">
        <StatCard
          icon={Banknote}
          label="Total Collected"
          value={money(summary.total_collected)}
          accent={{ bg: "bg-emerald-50", text: "text-emerald-600" }}
        />
        <StatCard
          icon={TrendingUp}
          label="Outstanding"
          value={money(summary.outstanding_balance)}
          sub={`${summary.invoice_counts.issued} issued, ${summary.invoice_counts.partial} partial`}
          accent={{ bg: "bg-amber-50", text: "text-amber-600" }}
        />
        <StatCard
          icon={Percent}
          label="Collection Rate"
          value={`${summary.collection_rate}%`}
          sub={`${money(summary.total_invoiced)} invoiced`}
          accent={{ bg: "bg-blue-50", text: "text-blue-600" }}
        />
        <StatCard
          icon={BadgePercent}
          label="Adjustments"
          value={money(summary.total_adjustments)}
          accent={{ bg: "bg-purple-50", text: "text-purple-600" }}
        />
        <StatCard
          icon={RotateCcw}
          label="Total Refunds"
          value={money(summary.total_refunds)}
          accent={{ bg: "bg-rose-50", text: "text-rose-600" }}
        />
      </div>

      {/* Monthly Revenue Chart */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-slate-900">
            Monthly Revenue Trend
          </h2>
          <span className="text-[12px] text-slate-400">Last 12 months</span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={revenue_trend}
              margin={{ top: 4, right: 8, left: -8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `Ksh ${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) => [money(value), "Revenue"]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  fontSize: 13,
                }}
              />
              <Bar
                dataKey="total"
                fill="#10b981"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Payments + Top Defaulters */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <TableHeader>
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              <h2 className="text-[15px] font-semibold text-slate-900">
                Recent Payments
              </h2>
            </div>
          </TableHeader>
          {recent_payments.length === 0 ? (
            <div
              className={`px-5 py-8 text-center text-slate-500 ${bodyTextClassName}`}
            >
              No payments recorded yet.
            </div>
          ) : (
            <TableWrapper>
              <Thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Amount</Th>
                  <Th>Method</Th>
                  <Th>Date</Th>
                </tr>
              </Thead>
              <Tbody>
                {recent_payments.map((p) => (
                  <tr key={p.id}>
                    <Td>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-slate-900">
                          {p.student_name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {p.admission_number}
                        </span>
                      </div>
                    </Td>
                    <Td className="font-semibold text-emerald-600">
                      {money(p.amount)}
                    </Td>
                    <Td className="text-slate-500">{p.method}</Td>
                    <Td className="text-slate-500">{p.payment_date}</Td>
                  </tr>
                ))}
              </Tbody>
            </TableWrapper>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <TableHeader>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-amber-500" />
              <h2 className="text-[15px] font-semibold text-slate-900">
                Top Defaulters
              </h2>
            </div>
          </TableHeader>
          {top_defaulters.length === 0 ? (
            <div
              className={`px-5 py-8 text-center text-slate-500 ${bodyTextClassName}`}
            >
              No defaulters found.
            </div>
          ) : (
            <TableWrapper>
              <Thead>
                <tr>
                  <Th>Student</Th>
                  <Th>Invoiced</Th>
                  <Th>Outstanding</Th>
                </tr>
              </Thead>
              <Tbody>
                {top_defaulters.map((s) => (
                  <tr key={s.id}>
                    <Td>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-slate-900">
                          {s.student_name}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {s.admission_number}
                        </span>
                      </div>
                    </Td>
                    <Td>{money(s.total_invoiced)}</Td>
                    <Td className="font-semibold text-red-600">
                      {money(s.outstanding)}
                    </Td>
                  </tr>
                ))}
              </Tbody>
            </TableWrapper>
          )}
        </div>
      </div>
    </section>
  );
}

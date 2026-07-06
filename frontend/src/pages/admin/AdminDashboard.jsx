import { useCallback, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  Users,
  Building2,
  BookOpen,
  GraduationCap,
  Calendar,
  HelpCircle,
} from "lucide-react";

import {
  TableHeader,
  TableWrapper,
  Tbody,
  Td,
  Th,
  Thead,
} from "@/components/DataTable";
import { useAdminDashboardApi } from "@/hooks/useAdminDashboardApi";
import { bodyTextClassName } from "@/lib/styles";

const STAT_ICONS = {
  users: Users,
  building: Building2,
  book: BookOpen,
  staff: GraduationCap,
  calendar: Calendar,
  support: HelpCircle,
};

const STAT_ACCENTS = {
  users: { bg: "bg-blue-50", text: "text-blue-600" },
  building: { bg: "bg-amber-50", text: "text-amber-600" },
  book: { bg: "bg-emerald-50", text: "text-emerald-600" },
  staff: { bg: "bg-purple-50", text: "text-purple-600" },
  calendar: { bg: "bg-cyan-50", text: "text-cyan-600" },
  support: { bg: "bg-rose-50", text: "text-rose-600" },
};

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accent.bg} ${accent.text}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[13px] font-medium text-slate-500">{label}</span>
      </div>
      <span className="text-[22px] font-semibold tracking-tight text-slate-900">{value}</span>
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  fontSize: 13,
};

export function AdminDashboard() {
  const api = useAdminDashboardApi();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.dashboard();
      setData(res.data);
    } catch {
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <section className="space-y-6">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">Admin Dashboard</h1>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-72 animate-pulse rounded-2xl bg-slate-100" />
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="space-y-6">
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">Admin Dashboard</h1>
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center text-red-600">{error}</div>
      </section>
    );
  }

  const {
    stats = [],
    counts = {},
    monthly_registrations = [],
    top_courses = [],
    active_sessions = [],
    recent_support_requests = [],
  } = data;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">Admin Dashboard</h1>
        <p className="mt-1 text-[14px] text-slate-500">Institution overview at a glance.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <StatCard
            key={stat.icon}
            icon={STAT_ICONS[stat.icon] ?? HelpCircle}
            label={stat.label}
            value={stat.value}
            accent={STAT_ACCENTS[stat.icon] ?? { bg: "bg-slate-50", text: "text-slate-600" }}
          />
        ))}
      </div>

      {/* Monthly Registrations */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-[15px] font-semibold text-slate-900">Monthly Registrations</h2>
          {monthly_registrations.length === 0 ? (
            <div className={`flex h-60 items-center justify-center text-slate-400 ${bodyTextClassName}`}>No data</div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly_registrations} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={(value) => [value, "Registrations"]} contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      {/* Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Sessions */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <TableHeader>
            <h2 className="text-[15px] font-semibold text-slate-900">Active Sessions</h2>
          </TableHeader>
          {active_sessions.length === 0 ? (
            <div className={`px-5 py-8 text-center text-slate-500 ${bodyTextClassName}`}>No active sessions.</div>
          ) : (
            <TableWrapper>
              <Thead>
                <tr>
                  <Th>Session</Th>
                  <Th>Enrolments</Th>
                  <Th>Status</Th>
                </tr>
              </Thead>
              <Tbody>
                {active_sessions.map((s) => (
                  <tr key={s.id}>
                    <Td className="font-medium text-slate-900">{s.name}</Td>
                    <Td>{s.enrolments_count}</Td>
                    <Td>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        s.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {s.is_active ? "Active" : "Inactive"}
                      </span>
                    </Td>
                  </tr>
                ))}
              </Tbody>
            </TableWrapper>
          )}
        </div>

        {/* Recent Support Requests */}
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <TableHeader>
            <h2 className="text-[15px] font-semibold text-slate-900">Recent Support Requests</h2>
          </TableHeader>
          {recent_support_requests.length === 0 ? (
            <div className={`px-5 py-8 text-center text-slate-500 ${bodyTextClassName}`}>No support requests.</div>
          ) : (
            <TableWrapper>
              <Thead>
                <tr>
                  <Th>Subject</Th>
                  <Th>Student</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                </tr>
              </Thead>
              <Tbody>
                {recent_support_requests.map((r) => (
                  <tr key={r.id}>
                    <Td className="max-w-[180px] truncate font-medium text-slate-900">{r.subject}</Td>
                    <Td className="text-slate-600">{r.student_name ?? "—"}</Td>
                    <Td>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        r.status === "resolved" ? "bg-emerald-50 text-emerald-700"
                        : r.status === "pending" ? "bg-amber-50 text-amber-700"
                        : r.status === "in_review" ? "bg-blue-50 text-blue-700"
                        : r.status === "escalated" ? "bg-red-50 text-red-700"
                        : "bg-slate-100 text-slate-500"
                      }`}>
                        {r.status}
                      </span>
                    </Td>
                    <Td className="text-slate-500">{r.created_at}</Td>
                  </tr>
                ))}
              </Tbody>
            </TableWrapper>
          )}
        </div>
      </div>

      {/* Top Courses */}
      {top_courses.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <TableHeader>
            <h2 className="text-[15px] font-semibold text-slate-900">Top Courses by Enrolment</h2>
          </TableHeader>
          <TableWrapper>
            <Thead>
              <tr>
                <Th>#</Th>
                <Th>Course</Th>
                <Th>Enrolled Students</Th>
              </tr>
            </Thead>
            <Tbody>
              {top_courses.map((c, i) => (
                <tr key={c.name}>
                  <Td className="text-slate-400">{i + 1}</Td>
                  <Td className="font-medium text-slate-900">{c.name}</Td>
                  <Td>{c.count}</Td>
                </tr>
              ))}
            </Tbody>
          </TableWrapper>
        </div>
      )}
    </section>
  );
}

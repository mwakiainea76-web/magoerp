import { useCallback, useEffect, useState } from "react";
import {
  Ban, ChartNoAxesColumn, Fingerprint, Monitor, MousePointerClick, OctagonAlert, ScrollText, ShieldAlert, Users,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { bodyTextClassName, initialMeta } from "@/lib/styles";
import { getApiErrorMessage } from "@/lib/api/authClient";
import { useSecurityApi } from "@/hooks/useSecurityApi";

export function SecurityDashboardPage() {
  const api = useSecurityApi();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const response = await api.getDashboard();
        if (mounted) setStats(response.data);
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load."));
      } finally { if (mounted) setIsLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, [api]);

  if (isLoading) {
    return <div className={`p-5 text-slate-500 ${bodyTextClassName}`}>Loading dashboard...</div>;
  }
  if (error) {
    return <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>;
  }
  if (!stats) {
    return <div className={`p-5 text-slate-500 ${bodyTextClassName}`}>No data available.</div>;
  }

  const trendData = Object.entries(stats.risk_trend ?? {}).map(([date, count]) => ({
    date,
    events: count,
  }));

  const severityColors = { low: "bg-slate-400", medium: "bg-amber-400", high: "bg-orange-500", critical: "bg-red-600" };

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Security Dashboard</h1>
        <p className="text-[13px] text-slate-500">Security overview and threat monitoring.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard icon={OctagonAlert} label="Failed Logins Today" value={stats.failed_logins_today} color="text-red-600" bg="bg-red-50" />
        <SummaryCard icon={ShieldAlert} label="High-Risk Users" value={stats.high_risk_users} color="text-orange-600" bg="bg-orange-50" />
        <SummaryCard icon={Monitor} label="Active Sessions" value={stats.active_sessions} color="text-emerald-600" bg="bg-emerald-50" />
        <SummaryCard icon={Ban} label="Blocked Users" value={stats.blocked_users} color="text-slate-600" bg="bg-slate-100" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard icon={Ban} label="Blocked Devices" value={stats.blocked_devices} color="text-slate-600" bg="bg-slate-100" />
        <SummaryCard icon={Ban} label="Blocked IPs" value={stats.blocked_ips} color="text-slate-600" bg="bg-slate-100" />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Risk Trend Chart */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
            <ChartNoAxesColumn className="h-4 w-4 text-slate-400" /> 7-Day Event Trend
          </h2>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="events" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-[13px] text-slate-400">No event data for the past week.</p>
          )}
        </div>

        {/* Events by Type */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
            <ScrollText className="h-4 w-4 text-slate-400" /> Events by Type (7 days)
          </h2>
          {Object.keys(stats.events_by_type ?? {}).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(stats.events_by_type).slice(0, 8).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-[13px]">
                  <span className="capitalize text-slate-600">{type.replace(/_/g, " ")}</span>
                  <span className="font-semibold text-slate-900">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-slate-400">No events in the past week.</p>
          )}
        </div>
      </div>

      {/* Recent Events */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 text-[15px] font-semibold text-slate-900">
          <MousePointerClick className="h-4 w-4 text-slate-400" /> Recent Security Events
        </h2>
        {stats.recent_events?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-semibold text-slate-500">
                  <th className="pb-2 pr-4">Event</th>
                  <th className="pb-2 pr-4">Severity</th>
                  <th className="pb-2 pr-4">User</th>
                  <th className="pb-2 pr-4">IP</th>
                  <th className="pb-2 pr-4">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recent_events.map((event) => (
                  <tr key={event.id}>
                    <td className="py-2 pr-4 capitalize text-slate-700">{event.event_type.replace(/_/g, " ")}</td>
                    <td className="py-2 pr-4">
                      <span className={`inline-block h-2 w-2 rounded-full ${severityColors[event.severity] ?? "bg-slate-400"}`} />
                      <span className="ml-1.5 capitalize text-slate-600">{event.severity}</span>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{event.user_name}</td>
                    <td className="py-2 pr-4 font-mono text-[12px] text-slate-500">{event.ip_address}</td>
                    <td className="py-2 pr-4 text-slate-500">{event.created_at ? new Date(event.created_at).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-[13px] text-slate-400">No recent events.</p>
        )}
      </div>
    </section>
  );
}

function SummaryCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div>
        <p className="text-[12px] text-slate-500">{label}</p>
        <p className={`text-[22px] font-bold ${color}`}>{value ?? 0}</p>
      </div>
    </div>
  );
}

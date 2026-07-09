import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, ExternalLink, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { useFinanceHealthApi } from "@/hooks/useFinanceHealthApi";
import { authClient, getApiErrorMessage } from "@/lib/api/authClient";
import { toast } from "react-hot-toast";

const statusConfig = {
  pass: { icon: CheckCircle, bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", iconColor: "text-emerald-500" },
  warning: { icon: AlertTriangle, bg: "bg-amber-50 border-amber-200", text: "text-amber-700", iconColor: "text-amber-500" },
  fail: { icon: XCircle, bg: "bg-red-50 border-red-200", text: "text-red-700", iconColor: "text-red-500" },
  info: { icon: CheckCircle, bg: "bg-blue-50 border-blue-200", text: "text-blue-700", iconColor: "text-blue-500" },
};

const currency = (amount) => `Ksh ${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function FinanceHealthPage() {
  const api = useFinanceHealthApi();
  const navigate = useNavigate();
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reconciling, setReconciling] = useState(false);
  const [expandedBreakdown, setExpandedBreakdown] = useState(null);

  async function fetchHealth() {
    setLoading(true);
    setError("");
    try {
      const res = await api.check();
      setChecks(res.data || []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load health data."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHealth();
  }, []);

  async function handleReconcile() {
    setReconciling(true);
    try {
      await authClient.post("/finance/reconcile");
      toast.success("Reconciliation completed.");
      fetchHealth();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Reconciliation failed."));
    } finally {
      setReconciling(false);
    }
  }

  const summary = {
    pass: checks.filter(c => c.status === "pass").length,
    warning: checks.filter(c => c.status === "warning").length,
    fail: checks.filter(c => c.status === "fail").length,
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">Finance Health</h1>
          <p className="mt-1 text-[14px] text-slate-500">System health checks for the finance module.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleReconcile} disabled={reconciling}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RotateCcw className={`size-4 ${reconciling ? "animate-spin" : ""}`} /> {reconciling ? "Reconciling..." : "Run Reconciliation"}
          </button>
          <button type="button" onClick={fetchHealth} disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-700 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-[12px] font-medium text-emerald-600">Passing</p>
          <p className="text-[24px] font-semibold text-emerald-700">{summary.pass}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-[12px] font-medium text-amber-600">Warnings</p>
          <p className="text-[24px] font-semibold text-amber-700">{summary.warning}</p>
        </div>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="text-[12px] font-medium text-red-600">Failures</p>
          <p className="text-[24px] font-semibold text-red-700">{summary.fail}</p>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {checks.map((check, index) => {
            const cfg = statusConfig[check.status] || statusConfig.info;
            const Icon = cfg.icon;
            const hasBreakdown = Array.isArray(check.breakdown) && check.breakdown.length > 0;
            const isExpanded = expandedBreakdown === index;
            return (
              <div key={index} className={`rounded-2xl border ${cfg.bg}`}>
                <div className="flex items-start gap-4 p-5">
                  <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${cfg.iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-[14px] font-semibold ${cfg.text}`}>{check.label}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${cfg.bg} ${cfg.text}`}>
                        {check.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[13px] text-slate-600">{check.detail}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {check.action && check.link && (
                        <button type="button" onClick={() => navigate(check.link)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50">
                          <ExternalLink className="h-3 w-3" /> {check.action}
                        </button>
                      )}
                      {hasBreakdown && (
                        <button type="button" onClick={() => setExpandedBreakdown(isExpanded ? null : index)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50">
                          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          {isExpanded ? "Hide details" : `View ${check.breakdown.length} discrepancy(ies)`}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {hasBreakdown && isExpanded && (
                  <div className="border-t border-slate-200 px-5 pb-4 pt-2">
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="min-w-full text-left text-[13px]">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50">
                            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Student</th>
                            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Session</th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cached</th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ledger</th>
                            <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500">Difference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {check.breakdown.map((row, i) => (
                            <tr key={i} className="border-b border-slate-100 last:border-b-0">
                              <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">{row.student_name}</td>
                              <td className="whitespace-nowrap px-3 py-2 text-slate-600">{row.session_name}</td>
                              <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-slate-600">{currency(row.cached_balance)}</td>
                              <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-slate-600">{currency(row.ledger_balance)}</td>
                              <td className={`whitespace-nowrap px-3 py-2 text-right font-mono font-semibold ${Math.abs(row.difference) < 0.01 ? "text-emerald-600" : "text-red-600"}`}>
                                {currency(row.difference)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-[12px] text-slate-400">Showing top 25 discrepancies. Run reconciliation to resolve.</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, RefreshCw } from "lucide-react";
import { SearchSelect } from "@/components/SearchSelect";
import { useFinanceHealthApi } from "@/hooks/useFinanceHealthApi";
import { authClient, getApiErrorMessage } from "@/lib/api/authClient";

const statusIcons = {
  pass: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
  fail: { icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50" },
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-50" },
};

export function FinanceReadinessPage() {
  const api = useFinanceHealthApi();
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    authClient.get("/academic-sessions", { params: { per_page: 100 } })
      .then(r => r.data)
      .then(res => {
        const opts = (res.data || []).map(s => ({ id: s.id, label: s.name }));
        setSessions(opts);
        if (opts.length > 0 && !selectedSession) {
          setSelectedSession(opts[0].id);
        }
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function checkReadiness() {
    if (!selectedSession) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.readiness({ academic_session_id: selectedSession });
      setData(res.data);
    } catch (e) {
      setError(getApiErrorMessage(e, "Readiness check failed."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (selectedSession) checkReadiness();
  }, [selectedSession]);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">Finance Readiness</h1>
        <p className="mt-1 text-[14px] text-slate-500">Check if an academic session is ready for fee billing.</p>
      </div>

      <div className="flex items-end gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="min-w-[240px] flex-1">
          <label className="mb-1 block text-[13px] font-medium text-slate-700">Academic Session</label>
          <SearchSelect placeholder="Select session" value={selectedSession}
            options={sessions} onChange={v => setSelectedSession(v)} />
        </div>
        <button type="button" onClick={checkReadiness} disabled={loading}
          className="flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Check
        </button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      )}

      {data && (
        <>
          <div className={`rounded-2xl border p-6 shadow-sm ${
            data.ready ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
          }`}>
            <div className="flex items-center gap-3">
              {data.ready ? (
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              ) : (
                <XCircle className="h-8 w-8 text-red-500" />
              )}
              <div>
                <p className={`text-[18px] font-semibold ${data.ready ? "text-emerald-700" : "text-red-700"}`}>
                  {data.session?.name} — {data.ready ? "Ready" : "Not Ready"}
                </p>
                <p className="text-[13px] text-slate-600">
                  {data.ready ? "All checks pass. Billing can proceed." : "Some issues need attention before billing."}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {data.issues?.map((issue, i) => {
              const cfg = statusIcons[issue.status] || statusIcons.info;
              const Icon = cfg.icon;
              return (
                <div key={i} className={`flex items-start gap-3 rounded-xl border border-slate-200 p-4 ${cfg.bg}`}>
                  <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${cfg.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-semibold text-slate-900">{issue.check}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                        issue.status === "pass" ? "bg-emerald-100 text-emerald-700" :
                        issue.status === "fail" ? "bg-red-100 text-red-700" :
                        issue.status === "warning" ? "bg-amber-100 text-amber-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>{issue.status}</span>
                    </div>
                    <p className="mt-0.5 text-[13px] text-slate-600">{issue.message}</p>
                    {issue.action && (
                      <p className="mt-1 text-[12px] text-slate-500">Action: {issue.action}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

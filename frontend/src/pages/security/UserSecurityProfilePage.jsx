import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

import { bodyTextClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useSecurityApi } from "@/hooks/useSecurityApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const severityColors = { low: "bg-slate-400", medium: "bg-amber-400", high: "bg-orange-500", critical: "bg-red-600" };

export function UserSecurityProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const api = useSecurityApi();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [trustingDeviceId, setTrustingDeviceId] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      try {
        const response = await api.showUserProfile(userId);
        if (mounted) setData(response.data);
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load."));
      } finally { if (mounted) setIsLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, [api, userId]);

  async function handleTrustDevice(deviceId) {
    setTrustingDeviceId(deviceId);
    try {
      await api.trustDevice(userId, deviceId);
      toast.success("Device trusted.");
      const response = await api.showUserProfile(userId);
      setData(response.data);
    } catch { toast.error("Failed to trust device."); }
    finally { setTrustingDeviceId(null); }
  }

  if (isLoading) {
    return <div className={`p-5 text-slate-500 ${bodyTextClassName}`}>Loading profile...</div>;
  }
  if (error) {
    return <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>;
  }
  if (!data) {
    return <div className={`p-5 text-slate-500 ${bodyTextClassName}`}>No data found.</div>;
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>

      {/* User Info */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">{data.user?.full_name}</h1>
            <p className="text-[13px] text-slate-500">{data.user?.email} &middot; {data.user?.login_id}</p>
          </div>
          <div className="text-right">
            <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium ${
              data.risk_level === "locked" ? "bg-red-50 text-red-700" :
              data.risk_level === "mfa" || data.risk_level === "captcha" ? "bg-amber-50 text-amber-700" :
              "bg-emerald-50 text-emerald-700"
            }`}>
              <Shield className="h-3.5 w-3.5" />
              Risk: {data.risk_score} ({data.risk_level})
            </div>
          </div>
        </div>
      </div>

      {/* Devices */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <h2 className="mb-4 text-[15px] font-semibold text-slate-900">Devices ({data.devices?.length ?? 0})</h2>
        {data.devices?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-semibold text-slate-500">
                  <th className="pb-2 pr-4">Browser / OS</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Risk</th>
                  <th className="pb-2 pr-4">Trusted</th>
                  <th className="pb-2 pr-4">Last Seen</th>
                  <th className="pb-2 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.devices.map((device) => (
                  <tr key={device.id}>
                    <td className="py-2 pr-4 text-slate-700">{device.browser ?? "—"} / {device.operating_system ?? "—"}</td>
                    <td className="py-2 pr-4 capitalize text-slate-600">{device.device_type}</td>
                    <td className="py-2 pr-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        device.risk_score > 60 ? "bg-red-50 text-red-700" :
                        device.risk_score > 30 ? "bg-amber-50 text-amber-700" :
                        "bg-slate-100 text-slate-600"
                      }`}>{device.risk_score}</span>
                    </td>
                    <td className="py-2 pr-4">{device.is_trusted ? <span className="text-emerald-600">Yes</span> : <span className="text-slate-400">No</span>}</td>
                    <td className="py-2 pr-4 text-slate-500">{device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : "—"}</td>
                    <td className="py-2 pr-4 text-right">
                      {!device.is_trusted ? (
                        <FormButton variant="secondary" onClick={() => handleTrustDevice(device.id)} disabled={trustingDeviceId === device.id} className="text-[12px]">
                          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                          {trustingDeviceId === device.id ? "..." : "Trust"}
                        </FormButton>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-[13px] text-slate-400">No devices found.</p>}
      </div>

      {/* Active Sessions */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <h2 className="mb-4 text-[15px] font-semibold text-slate-900">Active Sessions ({data.active_sessions?.length ?? 0})</h2>
        {data.active_sessions?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-semibold text-slate-500">
                  <th className="pb-2 pr-4">Device</th>
                  <th className="pb-2 pr-4">IP / Location</th>
                  <th className="pb-2 pr-4">Login At</th>
                  <th className="pb-2 pr-4">Last Activity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.active_sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="py-2 pr-4 text-slate-700">{session.device_browser ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <span className="font-mono text-[12px] text-slate-600">{session.ip_address}</span>
                      {session.city || session.country ? <span className="ml-1 text-[11px] text-slate-400">({[session.city, session.country].filter(Boolean).join(", ")})</span> : null}
                    </td>
                    <td className="py-2 pr-4 text-slate-500">{session.login_at ? new Date(session.login_at).toLocaleString() : "—"}</td>
                    <td className="py-2 pr-4 text-slate-500">{session.last_activity ? new Date(session.last_activity).toLocaleString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-[13px] text-slate-400">No active sessions.</p>}
      </div>

      {/* Recent Events */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <h2 className="mb-4 text-[15px] font-semibold text-slate-900">Recent Events</h2>
        {data.recent_events?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] font-semibold text-slate-500">
                  <th className="pb-2 pr-4">Event</th>
                  <th className="pb-2 pr-4">Severity</th>
                  <th className="pb-2 pr-4">Risk</th>
                  <th className="pb-2 pr-4">IP</th>
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recent_events.map((event) => (
                  <tr key={event.id}>
                    <td className="py-2 pr-4 capitalize text-slate-700">{event.event_type.replace(/_/g, " ")}</td>
                    <td className="py-2 pr-4">
                      <span className={`inline-block h-2 w-2 rounded-full ${severityColors[event.severity] ?? "bg-slate-400"}`} />
                      <span className="ml-1.5 capitalize text-slate-600">{event.severity}</span>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{event.risk_points > 0 ? `+${event.risk_points}` : "—"}</td>
                    <td className="py-2 pr-4 font-mono text-[12px] text-slate-500">{event.ip_address ?? "—"}</td>
                    <td className="py-2 pr-4 text-slate-500">{event.created_at ? new Date(event.created_at).toLocaleString() : "—"}</td>
                    <td className="py-2 pr-4">
                      {event.resolved ? (
                        <span className="text-emerald-600">Resolved</span>
                      ) : (
                        <span className="text-amber-600">Open</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-[13px] text-slate-400">No recent events.</p>}
      </div>
    </section>
  );
}

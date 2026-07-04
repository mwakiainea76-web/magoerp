import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowUpCircle, CheckCircle2 } from "lucide-react";

import { bodyTextClassName, labelTextClassName, selectClassName, inputClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useSupportRequestsApi } from "@/hooks/useSupportRequestsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const statusStyles = {
  pending: "bg-amber-50 text-amber-700",
  in_review: "bg-sky-50 text-sky-700",
  escalated: "bg-orange-50 text-orange-700",
  resolved: "bg-emerald-50 text-emerald-700",
};

export function AdminSupportRequestDetailPage() {
  const { supportRequestId } = useParams();
  const navigate = useNavigate();
  const api = useSupportRequestsApi();

  const [supportRequest, setSupportRequest] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [escalateTo, setEscalateTo] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const [requestRes, staffRes] = await Promise.all([
          api.show(supportRequestId),
          api.staffList(),
        ]);
        if (mounted) {
          setSupportRequest(requestRes.data ?? null);
          setStaffList(staffRes.data ?? []);
          setAdminNotes(requestRes.data?.admin_notes ?? "");
        }
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load request."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [supportRequestId]);

  async function handleReview() {
    setIsUpdating(true);
    try {
      const res = await api.review(supportRequestId, { admin_notes: adminNotes });
      setSupportRequest(res.data);
      toast.success("Request moved to In Review.");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to update."));
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleEscalate() {
    if (!escalateTo) { toast.error("Select a staff member to escalate to."); return; }
    setIsUpdating(true);
    try {
      const res = await api.escalate(supportRequestId, {
        escalated_to: escalateTo,
        admin_notes: adminNotes,
      });
      setSupportRequest(res.data);
      toast.success("Request escalated.");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to escalate."));
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleResolve() {
    setIsUpdating(true);
    try {
      const res = await api.resolve(supportRequestId, { admin_notes: adminNotes });
      setSupportRequest(res.data);
      toast.success("Request resolved.");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to resolve."));
    } finally {
      setIsUpdating(false);
    }
  }

  if (isLoading) {
    return <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading...</div>;
  }

  if (error) {
    return <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>;
  }

  if (!supportRequest) {
    return <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Request not found.</div>;
  }

  return (
    <section className="space-y-5">
      <button
        type="button"
        onClick={() => navigate("/support-requests")}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Requests
      </button>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-[18px] font-semibold text-slate-950">{supportRequest.subject}</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              by {supportRequest.student_name} ({supportRequest.admission_number})
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-semibold capitalize ${
              statusStyles[supportRequest.status] ?? "bg-slate-50 text-slate-600"
            }`}
          >
            {supportRequest.status.replace("_", " ")}
          </span>
        </div>

        <div className="mb-6 rounded-lg bg-slate-50 px-4 py-3">
          <p className="text-[14px] leading-6 text-slate-700 whitespace-pre-wrap">{supportRequest.description}</p>
        </div>

        <div className="grid gap-4 text-[13px] sm:grid-cols-2">
          <div>
            <span className="font-medium text-slate-500">Submitted:</span>
            <span className="ml-2 text-slate-700">
              {supportRequest.created_at ? new Date(supportRequest.created_at).toLocaleString() : "—"}
            </span>
          </div>
          <div>
            <span className="font-medium text-slate-500">Escalated To:</span>
            <span className="ml-2 text-slate-700">{supportRequest.escalated_to_name ?? "—"}</span>
          </div>
          {supportRequest.resolved_at ? (
            <div>
              <span className="font-medium text-slate-500">Resolved:</span>
              <span className="ml-2 text-slate-700">
                {new Date(supportRequest.resolved_at).toLocaleString()}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {supportRequest.status !== "resolved" ? (
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <h2 className="mb-4 text-[15px] font-semibold text-slate-900">Admin Actions</h2>

          <div className="space-y-4">
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Admin Notes</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className={`${inputClassName} min-h-[100px] resize-y py-3`}
                placeholder="Notes about this request..."
                maxLength={5000}
              />
            </div>

            {supportRequest.status === "pending" ? (
              <div className="flex gap-3">
                <FormButton onClick={handleReview} disabled={isUpdating}>
                  Mark In Review
                </FormButton>
              </div>
            ) : null}

            {supportRequest.status !== "resolved" ? (
              <div className="space-y-3 rounded-lg border border-slate-100 p-4">
                <h3 className="text-[13px] font-medium text-slate-700">Escalate Request</h3>
                <div className="flex gap-3">
                  <select
                    value={escalateTo}
                    onChange={(e) => setEscalateTo(e.target.value)}
                    className={`${selectClassName} flex-1`}
                  >
                    <option value="">Select staff member...</option>
                    {staffList.map((s) => (
                      <option key={s.id} value={s.id}>{s.name} ({s.employee_number})</option>
                    ))}
                  </select>
                  <FormButton onClick={handleEscalate} disabled={isUpdating || !escalateTo} variant="secondary">
                    <ArrowUpCircle className="mr-1.5 h-4 w-4" />
                    Escalate
                  </FormButton>
                </div>
              </div>
            ) : null}

            {supportRequest.status !== "resolved" ? (
              <div className="flex justify-end">
                <FormButton onClick={handleResolve} disabled={isUpdating} variant="danger">
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Resolve Request
                </FormButton>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LoaderCircle, AlertTriangle } from "lucide-react";
import { Modal, ModalBody, ModalFooter } from "@/components/Modal";
import { getApiErrorMessage } from "@/lib/api/authClient";

const money = (v) =>
  `KES ${Number(v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const REASONS = [
  "Bounced cheque",
  "Duplicate entry",
  "Wrong student",
  "Invalid transaction",
  "Other",
];

export function ReversePaymentModal({ open, onClose, payment, paymentsApi, onSuccess }) {
  const uid = useId();
  const submitRef = useRef(null);
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [preview, setPreview] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!open || !payment) return;
    setReason("");
    setOtherReason("");
    setConfirmed(false);
    setError("");
    setFieldErrors({});
    setPreview(null);
    paymentsApi.reversalPreview(payment.id).then(res => {
      setPreview(res.data);
    }).catch(() => {});
    const timer = setTimeout(() => submitRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open, payment, paymentsApi]);

  function validate() {
    const errs = {};
    if (!reason) errs.reason = "Select a reason.";
    if (reason === "Other" && !otherReason.trim()) errs.otherReason = "Describe the reason.";
    if (!confirmed) errs.confirmed = "You must confirm this action.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setError("");

    try {
      await paymentsApi.reverse(payment.id, {
        reason: reason === "Other" ? otherReason.trim() : reason,
        idempotency_key: `reverse:${payment.id}:${uid}`,
      });
      onSuccess?.("Payment reversed successfully.");
      onClose();
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to reverse payment."));
    } finally {
      setSubmitting(false);
    }
  }

  const totalCascade = preview
    ? preview.affected_invoices.reduce((s, inv) => s + inv.reversal_amount, 0) + preview.unallocated_credit
    : 0;

  return (
    <Modal open={open} onClose={onClose} title="Reverse Payment" size="lg">
      <ModalBody className="space-y-5">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

        {payment && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-[13px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Amount</span>
              <span className="font-semibold text-slate-900">{money(payment.amount)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-slate-500">Method</span>
              <span className="text-slate-700">{payment.method}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-slate-500">Date</span>
              <span className="text-slate-700">{payment.payment_date}</span>
            </div>
            {payment.reference && (
              <div className="mt-1 flex justify-between">
                <span className="text-slate-500">Reference</span>
                <span className="text-slate-700">{payment.reference}</span>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-600">Reason <span className="text-red-400">*</span></label>
          <select value={reason} onChange={e => setReason(e.target.value)}
            className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
            <option value="">Select a reason...</option>
            {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {fieldErrors.reason && <p className="mt-1 text-[12px] text-red-500">{fieldErrors.reason}</p>}
        </div>

        {reason === "Other" && (
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-600">Describe the reason <span className="text-red-400">*</span></label>
            <input type="text" value={otherReason} onChange={e => setOtherReason(e.target.value)}
              placeholder="Describe why this payment is being reversed..."
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-emerald-500" />
            {fieldErrors.otherReason && <p className="mt-1 text-[12px] text-red-500">{fieldErrors.otherReason}</p>}
          </div>
        )}

        {preview && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" /> This will
            </div>

            {preview.affected_invoices.length > 0 && (
              <div className="mt-2 divide-y divide-amber-200 text-[13px]">
                {preview.affected_invoices.map((inv, i) => (
                  <div key={inv.invoice_id || i} className="flex justify-between py-1">
                    <span className="text-amber-800">
                      Reopen {inv.invoice_number} (balance increases by {money(inv.reversal_amount)})
                    </span>
                    <span className="font-medium text-amber-900">{money(inv.reversal_amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {preview.unallocated_credit > 0 && (
              <p className="mt-2 text-[13px] text-amber-800">
                Remove {money(preview.unallocated_credit)} of unallocated credit.
              </p>
            )}
          </div>
        )}

        <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
          <span className="text-[13px] text-slate-600">I understand this cannot be undone.</span>
        </label>
        {fieldErrors.confirmed && <p className="text-[12px] text-red-500">{fieldErrors.confirmed}</p>}
      </ModalBody>

      <ModalFooter>
        <div className="flex w-full items-center justify-between">
          <div className="text-[13px] text-slate-500">
            {preview && `${preview.affected_invoices.length} invoice(s) affected`}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="button" ref={submitRef} onClick={handleSubmit} disabled={submitting || !confirmed}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-red-700 disabled:opacity-50">
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Reverse Payment
            </button>
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
}

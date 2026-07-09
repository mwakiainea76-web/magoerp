import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Modal, ModalBody, ModalFooter } from "@/components/Modal";
import { getApiErrorMessage } from "@/lib/api/authClient";

const money = (v) =>
  `KES ${Number(v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const METHODS = [
  ["M-Pesa", "M-Pesa"],
  ["Bank", "Bank"],
  ["Cash", "Cash"],
  ["Cheque", "Cheque"],
  ["Airtel", "Airtel"],
  ["HELB", "HELB"],
  ["Bursary", "Bursary"],
  ["Other", "Other"],
];

const REF_LABELS = {
  "M-Pesa": "Transaction code",
  Airtel: "Transaction code",
  Bank: "Reference / cheque no.",
  Cheque: "Reference / cheque no.",
  HELB: "Disbursement / transaction code",
  Bursary: "Disbursement / transaction code",
  Cash: "Reference (optional)",
};

export function RecordPaymentModal({ open, onClose, studentId, paymentsApi, overallBalance, onSuccess }) {
  const uid = useId();
  const submitRef = useRef(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("M-Pesa");
  const [reference, setReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [fifoPreview, setFifoPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const previewTimerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setMethod("M-Pesa");
    setReference("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setFifoPreview(null);
    setError("");
    setFieldErrors({});
    const timer = setTimeout(() => submitRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);

  const fetchPreview = useCallback(async (val) => {
    const num = parseFloat(val);
    if (!num || num <= 0) { setFifoPreview(null); return; }
    try {
      const res = await paymentsApi.fifoPreview(studentId, { amount: num });
      setFifoPreview(res.data);
    } catch {
      setFifoPreview(null);
    }
  }, [paymentsApi, studentId]);

  function handleAmountChange(val) {
    setAmount(val);
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => fetchPreview(val), 300);
  }

  function validate() {
    const errs = {};
    if (!amount || parseFloat(amount) <= 0) errs.amount = "Amount must be greater than zero.";
    if (!method) errs.method = "Select a payment method.";
    const refRequired = method !== "Cash";
    if (refRequired && !reference.trim()) errs.reference = `${REF_LABELS[method]} is required.`;
    if (!paymentDate) errs.paymentDate = "Payment date is required.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setError("");

    try {
      await paymentsApi.store({
        student_id: studentId,
        amount: parseFloat(amount),
        method,
        reference: reference.trim() || null,
        payment_date: paymentDate,
        notes: notes.trim() || null,
        idempotency_key: `pay:${studentId}:${uid}`,
      });
      onSuccess?.(`Payment of ${money(amount)} recorded.`);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to record payment."));
    } finally {
      setSubmitting(false);
    }
  }

  const totalOutstanding = fifoPreview?.total_amount || 0;
  const willBeUnallocated = fifoPreview && fifoPreview.unallocated_credit > 0;

  return (
    <Modal open={open} onClose={onClose} title="Record Payment" size="lg">
      <ModalBody className="space-y-5">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-600">Amount (KES) <span className="text-red-400">*</span></label>
            <input type="number" step="0.01" min="0.01" value={amount}
              onChange={e => handleAmountChange(e.target.value)}
              placeholder={overallBalance > 0 ? money(overallBalance) : "0.00"}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[14px] outline-none focus:border-emerald-500" />
            {fieldErrors.amount && <p className="mt-1 text-[12px] text-red-500">{fieldErrors.amount}</p>}
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-600">Method <span className="text-red-400">*</span></label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
              {METHODS.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-600">{REF_LABELS[method] || "Reference"}</label>
            <input type="text" value={reference} onChange={e => setReference(e.target.value)}
              placeholder={method === "Cash" ? "Optional" : "Required"}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-emerald-500" />
            {fieldErrors.reference && <p className="mt-1 text-[12px] text-red-500">{fieldErrors.reference}</p>}
          </div>

          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-600">Payment Date</label>
            <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-emerald-500" />
            {fieldErrors.paymentDate && <p className="mt-1 text-[12px] text-red-500">{fieldErrors.paymentDate}</p>}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-[13px] font-medium text-slate-600">Note</label>
          <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Optional"
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-emerald-500" />
        </div>

        {fifoPreview && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-slate-500">Applies to</p>

            {fifoPreview.allocations.length === 0 ? (
              <p className="text-[13px] text-slate-500">No outstanding invoices — the full amount will be recorded as unallocated credit.</p>
            ) : (
              <div className="divide-y divide-slate-200 text-[13px]">
                {fifoPreview.allocations.map((a, i) => (
                  <div key={a.invoice_id || i} className="flex justify-between py-1.5">
                    <span className="text-slate-700">{a.invoice_number} ({money(a.outstanding)} remaining)</span>
                    <span className="font-medium text-emerald-700">{money(a.allocation)}</span>
                  </div>
                ))}
              </div>
            )}

            {willBeUnallocated && (
              <p className="mt-2 text-[12px] text-amber-700">
                {money(fifoPreview.unallocated_credit)} will be recorded as unallocated credit.
              </p>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <div className="flex w-full items-center justify-between">
          <div className="text-[13px] text-slate-500">
            {overallBalance > 0 && `Outstanding: ${money(overallBalance)}`}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="button" ref={submitRef} onClick={handleSubmit} disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Record Payment — {money(parseFloat(amount) || 0)}
            </button>
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
}

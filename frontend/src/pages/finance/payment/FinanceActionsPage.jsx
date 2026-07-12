import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Banknote, RotateCcw, LoaderCircle, AlertTriangle, Search } from "lucide-react";
import { FormInput } from "@/components/FormInput";
import { useStudentsApi } from "@/hooks/useStudentsApi";
import { useStudentAccountApi } from "@/hooks/useStudentAccountApi";
import { usePaymentsApi } from "@/hooks/usePaymentsApi";
import { useRefundsApi } from "@/hooks/useRefundsApi";
import { toast } from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api/authClient";

const money = (v) =>
  `KES ${Number(v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PAYMENT_METHODS = [
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

const REASONS = [
  "Bounced cheque",
  "Duplicate entry",
  "Wrong student",
  "Invalid transaction",
  "Other",
];

export function FinanceActionsPage() {
  const navigate = useNavigate();
  const studentsApi = useStudentsApi();
  const accountApi = useStudentAccountApi();
  const paymentsApi = usePaymentsApi();
  const refundsApi = useRefundsApi();

  const [activeAction, setActiveAction] = useState("record");

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate("/finance/reports")}
          className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">Record Payments</h1>
          <p className="text-[13px] text-slate-500">Record payments, reverse payments, and process refunds</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <button type="button"
          onClick={() => setActiveAction("record")}
          className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-[13px] font-medium transition ${
            activeAction === "record"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}>
          <Banknote className="h-3.5 w-3.5" /> Record Payment
        </button>
        <button type="button"
          onClick={() => setActiveAction("reverse")}
          className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-[13px] font-medium transition ${
            activeAction === "reverse"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}>
          <RotateCcw className="h-3.5 w-3.5" /> Reverse Payment
        </button>
        <button type="button"
          onClick={() => setActiveAction("refund")}
          className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-[13px] font-medium transition ${
            activeAction === "refund"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}>
          <RotateCcw className="h-3.5 w-3.5" /> Refund
        </button>
      </div>

      {activeAction === "record" && <RecordPaymentForm studentsApi={studentsApi} accountApi={accountApi} paymentsApi={paymentsApi} />}
      {activeAction === "reverse" && <ReversePaymentForm studentsApi={studentsApi} accountApi={accountApi} paymentsApi={paymentsApi} />}
      {activeAction === "refund" && <RefundForm studentsApi={studentsApi} accountApi={accountApi} refundsApi={refundsApi} />}
    </section>
  );
}

function AdmissionNumberLookup({ studentsApi, accountApi, onStudentReady, formLabel }) {
  const [admNo, setAdmNo] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [studentData, setStudentData] = useState(null);

  async function handleLookup() {
    if (!admNo.trim()) { setLookupError("Enter an admission number."); return; }
    setLookupLoading(true);
    setLookupError("");
    try {
      const res = await studentsApi.list({ q: admNo.trim(), per_page: 5 });
      const matches = (res.data ?? []).filter(
        s => s.admission_number?.toLowerCase() === admNo.trim().toLowerCase()
      );
      if (matches.length === 0) {
        setLookupError("No student found with that admission number.");
        setStudentData(null);
        onStudentReady(null);
        return;
      }
      const student = matches[0];
      const overview = await accountApi.overview(student.id);
      setStudentData(overview.data);
      onStudentReady(overview.data);
    } catch (e) {
      setLookupError(getApiErrorMessage(e, "Failed to look up student."));
      setStudentData(null);
      onStudentReady(null);
    } finally {
      setLookupLoading(false);
    }
  }

  function handleClear() {
    setAdmNo("");
    setStudentData(null);
    setLookupError("");
    onStudentReady(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <FormInput label="Admission Number" type="text" value={admNo} onChange={e => setAdmNo(e.target.value)}
            placeholder="Enter admission number" />
        </div>
        {studentData ? (
          <button type="button" onClick={handleClear}
            className="h-10 rounded-lg border border-slate-200 px-4 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
            Clear
          </button>
        ) : (
          <button type="button" onClick={handleLookup} disabled={lookupLoading || !admNo.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {lookupLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Load
          </button>
        )}
      </div>
      {lookupError && <p className="text-[12px] text-red-500">{lookupError}</p>}

      {studentData && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[13px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-slate-900">{studentData.student.name}</p>
              <p className="text-slate-500">{studentData.student.admission_number} &mdash; {studentData.student.course || "No course"}</p>
            </div>
            <span className="text-[12px] text-slate-400">
              Balance: {money(studentData.overall_balance)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function RecordPaymentForm({ studentsApi, accountApi, paymentsApi }) {
  const uid = useId();
  const submitRef = useRef(null);
  const [studentData, setStudentData] = useState(null);
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

  function handleStudentReady(data) {
    setStudentData(data);
    setAmount("");
    setMethod("M-Pesa");
    setReference("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setFifoPreview(null);
    setError("");
    setFieldErrors({});
  }

  const overallBalance = studentData && studentData.overall_balance > 0 ? studentData.overall_balance : 0;

  const fetchPreview = useCallback(async (val) => {
    const num = parseFloat(val);
    if (!num || num <= 0 || !studentData) { setFifoPreview(null); return; }
    try {
      const res = await paymentsApi.fifoPreview(studentData.student.id, { amount: num });
      setFifoPreview(res.data);
    } catch {
      setFifoPreview(null);
    }
  }, [paymentsApi, studentData]);

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
        student_id: studentData.student.id,
        amount: parseFloat(amount),
        method,
        reference: reference.trim() || null,
        payment_date: paymentDate,
        notes: notes.trim() || null,
        idempotency_key: `pay:${studentData.student.id}:${uid}`,
      });
      toast.success(`Payment of ${money(amount)} recorded.`);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to record payment."));
    } finally {
      setSubmitting(false);
    }
  }

  const willBeUnallocated = fifoPreview && fifoPreview.unallocated_credit > 0;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3">
        <h2 className="text-[15px] font-semibold text-slate-900">Record Payment</h2>
      </div>
      <div className="space-y-5 p-5">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

        <AdmissionNumberLookup
          studentsApi={studentsApi}
          accountApi={accountApi}
          onStudentReady={handleStudentReady}
        />

        {studentData && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FormInput label="Amount" type="number" step="0.01" min="0.01" value={amount}
                  onChange={e => handleAmountChange(e.target.value)}
                  placeholder={overallBalance > 0 ? money(overallBalance) : "0.00"} error={fieldErrors.amount} />
              </div>

              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-600">Method <span className="text-red-400">*</span></label>
                <select value={method} onChange={e => setMethod(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                  {PAYMENT_METHODS.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}
                </select>
              </div>

              <div>
                <FormInput label={REF_LABELS[method] || "Reference"} type="text" value={reference} onChange={e => setReference(e.target.value)}
                  placeholder={method === "Cash" ? "Optional" : "Required"} error={fieldErrors.reference} />
              </div>

              <div>
                <FormInput label="Payment Date" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} error={fieldErrors.paymentDate} />
              </div>
            </div>

            <div>
              <FormInput label="Notes" type="text" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Optional" />
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

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="text-[13px] text-slate-500">
                {overallBalance > 0 && `Outstanding: ${money(overallBalance)}`}
              </div>
              <button type="button" ref={submitRef} onClick={handleSubmit} disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Record Payment — {money(parseFloat(amount) || 0)}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ReversePaymentForm({ studentsApi, accountApi, paymentsApi }) {
  const uid = useId();
  const submitRef = useRef(null);
  const [studentData, setStudentData] = useState(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState("");
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [preview, setPreview] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  function handleStudentReady(data) {
    setStudentData(data);
    setSelectedPaymentId("");
    setReason("");
    setOtherReason("");
    setConfirmed(false);
    setPreview(null);
    setError("");
    setFieldErrors({});
  }

  useEffect(() => {
    if (!selectedPaymentId) { setPreview(null); return; }
    paymentsApi.reversalPreview(selectedPaymentId).then(res => {
      setPreview(res.data);
    }).catch(() => {
      setPreview(null);
    });
  }, [selectedPaymentId, paymentsApi]);

  const completedPayments = studentData?.payments?.filter(p => p.status === "completed") || [];
  const selectedPayment = completedPayments.find(p => p.id === selectedPaymentId);

  function validate() {
    const errs = {};
    if (!selectedPaymentId) errs.selectedPaymentId = "Select a payment.";
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
      await paymentsApi.reverse(selectedPaymentId, {
        reason: reason === "Other" ? otherReason.trim() : reason,
        idempotency_key: `reverse:${selectedPaymentId}:${uid}`,
      });
      toast.success("Payment reversed successfully.");
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to reverse payment."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3">
        <h2 className="text-[15px] font-semibold text-slate-900">Reverse Payment</h2>
      </div>
      <div className="space-y-5 p-5">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

        <AdmissionNumberLookup
          studentsApi={studentsApi}
          accountApi={accountApi}
          onStudentReady={handleStudentReady}
        />

        {studentData && (
          <>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">Payment <span className="text-red-400">*</span></label>
              <select value={selectedPaymentId} onChange={e => setSelectedPaymentId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                <option value="">Select a completed payment...</option>
                {completedPayments.map(p => (
                  <option key={p.id} value={p.id}>
                    {money(p.amount)} — {p.method} ({p.payment_date}){p.reference ? ` — ${p.reference}` : ""}
                  </option>
                ))}
              </select>
              {fieldErrors.selectedPaymentId && <p className="mt-1 text-[12px] text-red-500">{fieldErrors.selectedPaymentId}</p>}
              {completedPayments.length === 0 && (
                <p className="mt-1 text-[12px] text-amber-600">No completed payments for this student.</p>
              )}
            </div>

            {selectedPayment && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-semibold text-slate-900">{money(selectedPayment.amount)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-slate-500">Method</span>
                  <span className="text-slate-700">{selectedPayment.method}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-slate-500">Date</span>
                  <span className="text-slate-700">{selectedPayment.payment_date}</span>
                </div>
                {selectedPayment.reference && (
                  <div className="mt-1 flex justify-between">
                    <span className="text-slate-500">Reference</span>
                    <span className="text-slate-700">{selectedPayment.reference}</span>
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
                <FormInput label="Reason" type="text" value={otherReason} onChange={e => setOtherReason(e.target.value)}
                  placeholder="Describe why this payment is being reversed..." error={fieldErrors.otherReason} />
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

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="text-[13px] text-slate-500">
                {preview && `${preview.affected_invoices.length} invoice(s) affected`}
              </div>
              <button type="button" ref={submitRef} onClick={handleSubmit} disabled={submitting || !confirmed}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Reverse Payment
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function RefundForm({ studentsApi, accountApi, refundsApi }) {
  const uid = useId();
  const submitRef = useRef(null);
  const [studentData, setStudentData] = useState(null);
  const [creditBalance, setCreditBalance] = useState(null);
  const [isFetchingCredit, setIsFetchingCredit] = useState(false);
  const [invoiceId, setInvoiceId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  function handleStudentReady(data) {
    setStudentData(data);
    setCreditBalance(null);
    setInvoiceId("");
    setReason("");
    setError("");
    setFieldErrors({});
    if (!data) return;
    fetchCredit(data.student.id);
  }

  async function fetchCredit(studentId) {
    setIsFetchingCredit(true);
    try {
      const res = await accountApi.overview(studentId);
      const balance = res.data?.overall_balance ?? 0;
      setCreditBalance(balance > 0 ? balance : 0);
    } catch {
      setCreditBalance(0);
    } finally {
      setIsFetchingCredit(false);
    }
  }

  function validate() {
    const errs = {};
    if (!studentData) errs.student = "Look up a student first.";
    if (!creditBalance || creditBalance <= 0) errs.credit = "No available credit to refund.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setError("");
    try {
      await refundsApi.store({
        student_id: studentData.student.id,
        reason: reason.trim() || null,
        invoice_id: invoiceId.trim() || null,
      });
      toast.success(`Refund of ${money(creditBalance)} processed.`);
      setInvoiceId("");
      setReason("");
      setCreditBalance(null);
      setStudentData(null);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to process refund."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3">
        <h2 className="text-[15px] font-semibold text-slate-900">Process Refund</h2>
      </div>
      <div className="space-y-5 p-5">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

        <AdmissionNumberLookup
          studentsApi={studentsApi}
          accountApi={accountApi}
          onStudentReady={handleStudentReady}
        />

        {studentData && (
          <>
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
              <p className="text-[13px] text-sky-700">
                Available Credit: <span className="font-semibold">
                  {isFetchingCredit ? "Loading..." : creditBalance !== null ? money(creditBalance) : "N/A"}
                </span>
              </p>
              {creditBalance !== null && creditBalance <= 0 && !isFetchingCredit && (
                <p className="mt-1 text-[12px] text-sky-600">This student has no available credit to refund.</p>
              )}
            </div>

            {creditBalance > 0 && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[13px] font-medium text-slate-600">Refund Amount</label>
                    <div className="flex h-10 items-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-[14px] font-semibold text-slate-900">
                      {money(creditBalance)}
                    </div>
                  </div>
                  <div>
                    <FormInput label="Invoice (optional)" type="text" value={invoiceId}
                      onChange={e => setInvoiceId(e.target.value)}
                      placeholder="Leave blank for general refund" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600">Reason</label>
                  <textarea
                    className="h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[14px] leading-5 text-slate-700 outline-none transition placeholder:text-[13px] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Reason for refund..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                </div>
              </>
            )}

            {fieldErrors.credit && <p className="text-[12px] text-red-500">{fieldErrors.credit}</p>}

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="text-[13px] text-slate-500">
                {creditBalance > 0 ? `Refundable: ${money(creditBalance)}` : ""}
              </div>
              <button type="button" ref={submitRef} onClick={handleSubmit} disabled={submitting || !creditBalance || creditBalance <= 0}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Process Refund
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

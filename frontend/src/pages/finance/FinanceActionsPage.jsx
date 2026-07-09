import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Banknote, Plus, RotateCcw, LoaderCircle, AlertTriangle, Search, FileX } from "lucide-react";
import { useStudentsApi } from "@/hooks/useStudentsApi";
import { useStudentAccountApi } from "@/hooks/useStudentAccountApi";
import { useInvoicesApi } from "@/hooks/useInvoicesApi";
import { usePaymentsApi } from "@/hooks/usePaymentsApi";
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
  const invoicesApi = useInvoicesApi();
  const paymentsApi = usePaymentsApi();

  const [activeAction, setActiveAction] = useState("record");

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => navigate("/admin/finance/student-accounts")}
          className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">Finance Actions</h1>
          <p className="text-[13px] text-slate-500">Issue invoices, record and reverse payments, reverse invoices</p>
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
          onClick={() => setActiveAction("issue")}
          className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-[13px] font-medium transition ${
            activeAction === "issue"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}>
          <Plus className="h-3.5 w-3.5" /> Issue Invoice
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
          onClick={() => setActiveAction("reverse-invoice")}
          className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-[13px] font-medium transition ${
            activeAction === "reverse-invoice"
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-300 text-slate-600 hover:bg-slate-50"
          }`}>
          <FileX className="h-3.5 w-3.5" /> Reverse Invoice
        </button>
      </div>

      {activeAction === "record" && <RecordPaymentForm studentsApi={studentsApi} accountApi={accountApi} paymentsApi={paymentsApi} />}
      {activeAction === "issue" && <IssueInvoiceForm studentsApi={studentsApi} accountApi={accountApi} invoicesApi={invoicesApi} />}
      {activeAction === "reverse" && <ReversePaymentForm studentsApi={studentsApi} accountApi={accountApi} paymentsApi={paymentsApi} />}
      {activeAction === "reverse-invoice" && <ReverseInvoiceForm studentsApi={studentsApi} accountApi={accountApi} invoicesApi={invoicesApi} />}
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
          <label className="mb-1 block text-[13px] font-medium text-slate-600">Admission Number</label>
          <input type="text" value={admNo} onChange={e => setAdmNo(e.target.value)}
            placeholder="Enter admission number"
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-emerald-500" />
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

function IssueInvoiceForm({ studentsApi, accountApi, invoicesApi }) {
  const uid = useId();
  const submitRef = useRef(null);
  const [studentData, setStudentData] = useState(null);
  const [invoiceType, setInvoiceType] = useState("fee");
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateItems, setTemplateItems] = useState([]);
  const [penaltyDesc, setPenaltyDesc] = useState("");
  const [penaltyAmount, setPenaltyAmount] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  function handleStudentReady(data) {
    setStudentData(data);
    setError("");
    setFieldErrors({});
    setInvoiceType("fee");
    setSelectedTemplateId("");
    setTemplateItems([]);
    setPenaltyDesc("");
    setPenaltyAmount("");
    const d = new Date(); d.setDate(d.getDate() + 30);
    setDueDate(d.toISOString().split("T")[0]);
    if (data) {
      invoicesApi.availableTemplates(data.student.id).then(res => {
        setTemplates(res.data ?? []);
      }).catch(() => {});
    }
  }

  function handleTemplateChange(feeTemplateId) {
    setSelectedTemplateId(feeTemplateId);
    setTemplateItems(feeTemplateId ? (templates.find(t => t.fee_template_id === feeTemplateId)?.items ?? []) : []);
  }

  function validate() {
    const errs = {};
    if (invoiceType === "penalty") {
      if (!penaltyDesc.trim()) errs.penaltyDesc = "Description is required.";
      if (!penaltyAmount || parseFloat(penaltyAmount) <= 0) errs.penaltyAmount = "Amount must be greater than zero.";
    } else {
      if (!selectedTemplateId) errs.selectedTemplateId = "Select a fee template.";
    }
    if (!dueDate) errs.dueDate = "Due date is required.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSubmitting(true);
    setError("");
    try {
      if (invoiceType === "fee") {
        const tpl = templates.find(t => t.fee_template_id === selectedTemplateId);
        await invoicesApi.create({
          student_id: studentData.student.id,
          fee_template_id: selectedTemplateId,
          idempotency_key: `issue:${studentData.student.id}:${uid}`,
        });
        toast.success(`Invoice issued from template "${tpl?.template_name || ""}"`);
      } else {
        await invoicesApi.createCharge({
          student_id: studentData.student.id,
          charge_type: "penalty",
          amount: parseFloat(penaltyAmount),
          description: penaltyDesc.trim(),
        });
        toast.success("Penalty invoice issued.");
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to issue invoice."));
    } finally {
      setSubmitting(false);
    }
  }

  const totalAmount = invoiceType === "fee"
    ? templateItems.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0)
    : (parseFloat(penaltyAmount) || 0);

  const noTemplates = invoiceType === "fee" && templates.length === 0;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3">
        <h2 className="text-[15px] font-semibold text-slate-900">Issue Invoice</h2>
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
            <div className="flex gap-2 rounded-xl bg-slate-100 p-1">
              <button type="button"
                onClick={() => { setInvoiceType("fee"); setFieldErrors({}); }}
                className={`flex-1 rounded-lg py-2 text-[13px] font-medium transition ${invoiceType === "fee" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                Fee from template
              </button>
              <button type="button"
                onClick={() => { setInvoiceType("penalty"); setFieldErrors({}); }}
                className={`flex-1 rounded-lg py-2 text-[13px] font-medium transition ${invoiceType === "penalty" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                Penalty / manual charge
              </button>
            </div>

            {invoiceType === "fee" ? (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600">Fee Template</label>
                  <select value={selectedTemplateId} onChange={e => handleTemplateChange(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                    <option value="">Select a template...</option>
                    {templates.map(t => <option key={t.fee_template_id} value={t.fee_template_id}>{t.template_name} ({t.template_code})</option>)}
                  </select>
                  {fieldErrors.selectedTemplateId && <p className="mt-1 text-[12px] text-red-500">{fieldErrors.selectedTemplateId}</p>}
                </div>

                {noTemplates && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
                    No approved fee assignment found for this student's curriculum/session/year.
                    Set one up in Fee Structures first.
                  </div>
                )}

                {templateItems.length > 0 && (
                  <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {templateItems.map((item, i) => (
                      <div key={item.id || i} className="flex justify-between px-4 py-2 text-[13px]">
                        <span className="text-slate-700">{item.name}</span>
                        <span className="font-medium text-slate-900">{money(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600">Due Date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-emerald-500" />
                  {fieldErrors.dueDate && <p className="mt-1 text-[12px] text-red-500">{fieldErrors.dueDate}</p>}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600">Description <span className="text-red-400">*</span></label>
                  <input type="text" value={penaltyDesc} onChange={e => setPenaltyDesc(e.target.value)}
                    placeholder="e.g. Late registration penalty"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-emerald-500" />
                  {fieldErrors.penaltyDesc && <p className="mt-1 text-[12px] text-red-500">{fieldErrors.penaltyDesc}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600">Amount <span className="text-red-400">*</span></label>
                  <input type="number" step="0.01" min="0.01" value={penaltyAmount} onChange={e => setPenaltyAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-emerald-500" />
                  {fieldErrors.penaltyAmount && <p className="mt-1 text-[12px] text-red-500">{fieldErrors.penaltyAmount}</p>}
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600">Due Date</label>
                  <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-emerald-500" />
                  {fieldErrors.dueDate && <p className="mt-1 text-[12px] text-red-500">{fieldErrors.dueDate}</p>}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="text-[15px] font-semibold text-slate-900">
                Total: <span className="text-emerald-700">{money(totalAmount)}</span>
              </div>
              <button type="button" ref={submitRef} onClick={handleSubmit} disabled={submitting || (invoiceType === "fee" && noTemplates)}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Issue Invoice — {money(totalAmount)}
              </button>
            </div>
          </>
        )}
      </div>
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
                  {PAYMENT_METHODS.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}
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

function ReverseInvoiceForm({ studentsApi, accountApi, invoicesApi }) {
  const uid = useId();
  const submitRef = useRef(null);
  const [studentData, setStudentData] = useState(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  function handleStudentReady(data) {
    setStudentData(data);
    setSelectedInvoiceId("");
    setReason("");
    setOtherReason("");
    setConfirmed(false);
    setError("");
    setFieldErrors({});
  }

  const reversibleInvoices = studentData?.invoices?.filter(
    inv => inv.status === "issued" || inv.status === "partial"
  ) || [];
  const selectedInvoice = reversibleInvoices.find(inv => inv.id === selectedInvoiceId);

  function validate() {
    const errs = {};
    if (!selectedInvoiceId) errs.selectedInvoiceId = "Select an invoice.";
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
      await invoicesApi.reverse(selectedInvoiceId, {
        reason: reason === "Other" ? otherReason.trim() : reason,
        idempotency_key: `reverse-invoice:${selectedInvoiceId}:${uid}`,
      });
      toast.success("Invoice reversed successfully.");
      setSelectedInvoiceId("");
      setReason("");
      setOtherReason("");
      setConfirmed(false);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to reverse invoice."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-3">
        <h2 className="text-[15px] font-semibold text-slate-900">Reverse Invoice</h2>
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
              <label className="mb-1 block text-[13px] font-medium text-slate-600">Invoice <span className="text-red-400">*</span></label>
              <select value={selectedInvoiceId} onChange={e => setSelectedInvoiceId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                <option value="">Select a reversible invoice...</option>
                {reversibleInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} — {money(inv.amount_due)} ({inv.status})
                  </option>
                ))}
              </select>
              {fieldErrors.selectedInvoiceId && <p className="mt-1 text-[12px] text-red-500">{fieldErrors.selectedInvoiceId}</p>}
              {reversibleInvoices.length === 0 && (
                <p className="mt-1 text-[12px] text-amber-600">No reversible invoices for this student.</p>
              )}
            </div>

            {selectedInvoice && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Invoice</span>
                  <span className="font-semibold text-slate-900">{selectedInvoice.invoice_number}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-semibold text-slate-900">{money(selectedInvoice.amount_due)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="capitalize text-slate-700">{selectedInvoice.status}</span>
                </div>
                {selectedInvoice.items_count > 0 && (
                  <div className="mt-1 flex justify-between">
                    <span className="text-slate-500">Items</span>
                    <span className="text-slate-700">{selectedInvoice.items_count}</span>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">Reason <span className="text-red-400">*</span></label>
              <select value={reason} onChange={e => setReason(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-[13px] outline-none focus:border-emerald-500">
                <option value="">Select a reason...</option>
                <option value="Wrongly issued">Wrongly issued</option>
                <option value="Duplicate">Duplicate</option>
                <option value="Student not enrolled">Student not enrolled</option>
                <option value="Fee template changed">Fee template changed</option>
                <option value="Other">Other</option>
              </select>
              {fieldErrors.reason && <p className="mt-1 text-[12px] text-red-500">{fieldErrors.reason}</p>}
            </div>

            {reason === "Other" && (
              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-600">Describe the reason <span className="text-red-400">*</span></label>
                <input type="text" value={otherReason} onChange={e => setOtherReason(e.target.value)}
                  placeholder="Describe why this invoice is being reversed..."
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[13px] outline-none focus:border-emerald-500" />
                {fieldErrors.otherReason && <p className="mt-1 text-[12px] text-red-500">{fieldErrors.otherReason}</p>}
              </div>
            )}

            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
              <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              <span className="text-[13px] text-slate-600">I understand this will cancel the invoice and cannot be undone.</span>
            </label>
            {fieldErrors.confirmed && <p className="text-[12px] text-red-500">{fieldErrors.confirmed}</p>}

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="text-[13px] text-slate-500">
                {selectedInvoice ? `Amount to reverse: ${money(selectedInvoice.amount_due)}` : ""}
              </div>
              <button type="button" ref={submitRef} onClick={handleSubmit} disabled={submitting || !confirmed}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-red-700 disabled:opacity-50">
                {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Reverse Invoice
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

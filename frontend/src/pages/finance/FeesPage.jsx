import { useEffect, useState } from "react";
import { Banknote, FileText, Percent } from "lucide-react";
import toast from "react-hot-toast";

import { bodyTextClassName, inputClassName, labelTextClassName, selectClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { LookupSelect } from "@/components/LookupSelect";
import { Modal, ModalBody, ModalFooter } from "@/components/Modal";
import { useLookupApi } from "@/hooks/useLookupApi";
import { usePaymentsApi } from "@/hooks/usePaymentsApi";
import { useInvoicesApi } from "@/hooks/useInvoicesApi";

import { getApiErrorMessage } from "@/lib/api/authClient";

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "mobile_banking", label: "Mobile Banking" },
];

function formatCurrency(amount) {
  return `Ksh ${Number(amount || 0).toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function FeesPage() {
  const lookupApi = useLookupApi();
  const paymentsApi = usePaymentsApi();
  const invoicesApi = useInvoicesApi();


  const [activeModal, setActiveModal] = useState(null);

  function closeModal() {
    setActiveModal(null);
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Fees</h1>
        <p className="mt-1 text-[14px] text-slate-500">Manage student fees, payments, and adjustments</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          icon={Banknote}
          title="Record Payment"
          description="Record a payment received from a student"
          onClick={() => setActiveModal("payment")}
        />
        <ActionCard
          icon={FileText}
          title="Issue Invoice"
          description="Generate a new fee invoice for a student"
          onClick={() => setActiveModal("invoice")}
        />
      </div>

      <RecordPaymentModal
        open={activeModal === "payment"}
        onClose={closeModal}
        lookupApi={lookupApi}
        paymentsApi={paymentsApi}
        invoicesApi={invoicesApi}
      />

      <IssueInvoiceModal
        open={activeModal === "invoice"}
        onClose={closeModal}
        lookupApi={lookupApi}
        invoicesApi={invoicesApi}
      />

    </section>
  );
}

function ActionCard({ icon: Icon, title, description, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex flex-col items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-6 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-100">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
      <p className={`text-slate-500 ${bodyTextClassName}`}>{description}</p>
    </button>
  );
}

function RecordPaymentModal({ open, onClose, lookupApi, paymentsApi, invoicesApi }) {
  const [studentValue, setStudentValue] = useState("");
  const [studentOption, setStudentOption] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!studentOption?.id) {
      setInvoices([]);
      setSelectedInvoiceId("");
      return;
    }

    let mounted = true;
    setLoadingInvoices(true);

    async function loadInvoices() {
      try {
        const response = await invoicesApi.list({
          q: studentOption.admission_number || studentOption.name,
          status: "all",
          per_page: 50,
        });
        if (mounted) {
          const outstanding = (response.data ?? []).filter(
            (inv) => Number(inv.balance_due) > 0,
          );
          setInvoices(outstanding);
          if (outstanding.length > 0 && !selectedInvoiceId) {
            setSelectedInvoiceId(outstanding[0].id);
          }
        }
      } catch {
        if (mounted) setInvoices([]);
      } finally {
        if (mounted) setLoadingInvoices(false);
      }
    }

    loadInvoices();

    return () => { mounted = false; };
  }, [studentOption?.id, invoicesApi]);

  async function fetchStudentOptions(query) {
    const response = await lookupApi.search("students", { query, limit: 10 });
    return (response.data ?? []).map((s) => ({
      id: s.id,
      label: `${s.first_name} ${s.middle_name ? s.middle_name + " " : ""}${s.last_name} (${s.admission_number})`,
      admission_number: s.admission_number,
      name: `${s.first_name} ${s.middle_name ? s.middle_name + " " : ""}${s.last_name}`,
    }));
  }

  function resetForm() {
    setStudentValue("");
    setStudentOption(null);
    setInvoices([]);
    setSelectedInvoiceId("");
    setAmount("");
    setMethod("cash");
    setReference("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setNotes("");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedInvoiceId) {
      setError("Select an invoice.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await paymentsApi.store({
        student_id: studentOption.id,
        amount: Number(amount),
        method,
        reference: reference.trim() || null,
        payment_date: paymentDate || null,
        notes: notes.trim() || null,
      });
      toast.success("Payment recorded successfully.");
      resetForm();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to record payment."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Record Payment" size="lg">
      <ModalBody>
        <form id="record-payment-form" onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>
              {error}
            </div>
          ) : null}

          <LookupSelect
            label="Student"
            value={studentValue}
            selectedOption={studentOption}
            onChange={(nextValue, option) => {
              setStudentValue(nextValue);
              setStudentOption(option);
            }}
            fetchOptions={fetchStudentOptions}
            placeholder="Search student by name or admission"
            emptyMessage="No students found"
            required
          />

          {studentOption ? (
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>
                Outstanding Invoice *
              </label>
              {loadingInvoices ? (
                <p className={`text-slate-400 ${bodyTextClassName}`}>Loading invoices...</p>
              ) : invoices.length === 0 ? (
                <p className={`text-slate-500 ${bodyTextClassName}`}>No outstanding invoices for this student.</p>
              ) : (
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className={`${selectClassName} w-full`}
                  required
                >
                  {invoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} — {formatCurrency(inv.balance_due)} balance
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : null}

          {invoices.length > 0 ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>
                    Amount *
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={inputClassName}
                    placeholder="e.g. 5000"
                    required
                  />
                </div>
                <div>
                  <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>
                    Payment Method *
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className={`${selectClassName} w-full`}
                    required
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm.value} value={pm.value}>{pm.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>
                    Reference
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className={inputClassName}
                    placeholder="e.g. M-Pesa transaction code"
                  />
                </div>
                <div>
                  <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>
                    Payment Date
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className={inputClassName}
                  />
                </div>
              </div>

              <div>
                <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>
                  Notes
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={inputClassName}
                  placeholder="Optional notes about this payment"
                />
              </div>
            </>
          ) : null}
        </form>
      </ModalBody>
      <ModalFooter>
        <FormButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </FormButton>
        <FormButton
          type="submit"
          form="record-payment-form"
          disabled={saving || invoices.length === 0}
        >
          {saving ? "Recording..." : "Record Payment"}
        </FormButton>
      </ModalFooter>
    </Modal>
  );
}

function IssueInvoiceModal({ open, onClose, lookupApi, invoicesApi }) {
  const [studentValue, setStudentValue] = useState("");
  const [studentOption, setStudentOption] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  function resetForm() {
    setStudentValue("");
    setStudentOption(null);
    setError("");
    setResult(null);
  }

  async function fetchStudentOptions(query) {
    const response = await lookupApi.search("students", { query, limit: 10 });
    return (response.data ?? []).map((s) => ({
      id: s.id,
      label: `${s.first_name} ${s.middle_name ? s.middle_name + " " : ""}${s.last_name} (${s.admission_number})`,
      admission_number: s.admission_number,
      name: `${s.first_name} ${s.middle_name ? s.middle_name + " " : ""}${s.last_name}`,
    }));
  }

  async function handleGenerate() {
    if (!studentOption?.id) return;

    setSaving(true);
    setError("");
    setResult(null);

    try {
      const response = await invoicesApi.create({ student_id: studentOption.id });
      setResult(response.data ?? response);
      toast.success("Invoice issued successfully.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to issue invoice."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Issue Invoice" size="md">
      <ModalBody>
        {error ? (
          <div className={`mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-[14px] font-medium text-emerald-800">Invoice issued successfully!</p>
            <div className="text-[13px] text-emerald-700 space-y-1">
              <p>Invoice: <strong>{result.invoice_number}</strong></p>
              <p>Amount: <strong>{formatCurrency(result.amount_due)}</strong></p>
              <p>Status: <strong className="capitalize">{result.status}</strong></p>
            </div>
            <FormButton type="button" variant="secondary" onClick={resetForm} className="mt-2">
              Issue Another
            </FormButton>
          </div>
        ) : (
          <div className="space-y-4">
            <LookupSelect
              label="Student"
              value={studentValue}
              selectedOption={studentOption}
              onChange={(nextValue, option) => {
                setStudentValue(nextValue);
                setStudentOption(option);
              }}
              fetchOptions={fetchStudentOptions}
              placeholder="Search student by name or admission"
              emptyMessage="No students found"
              required
            />

            {studentOption ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className={`text-slate-600 ${bodyTextClassName}`}>
                  <span className="font-medium text-slate-800">Student:</span> {studentOption.name}
                </p>
                <p className={`text-slate-600 ${bodyTextClassName}`}>
                  <span className="font-medium text-slate-800">Admission:</span> {studentOption.admission_number}
                </p>
                <p className={`mt-2 text-slate-500 ${bodyTextClassName}`}>
                  An invoice will be generated for the current active academic session using the student&apos;s assigned fee template.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </ModalBody>
      {!result ? (
        <ModalFooter>
          <FormButton type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </FormButton>
          <FormButton
            type="button"
            disabled={!studentOption || saving}
            onClick={handleGenerate}
          >
            {saving ? "Issuing..." : "Issue Invoice"}
          </FormButton>
        </ModalFooter>
      ) : null}
    </Modal>
  );
}

export default FeesPage;

import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import {
  AlertTriangle,
  Eye,
  Gift,
  Receipt,
  RotateCcw,
  Undo2,
  Wallet,
} from "lucide-react";
import toast from "react-hot-toast";
import * as yup from "yup";

import { bodyTextClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { LookupSelect } from "@/components/LookupSelect";
import { SearchSelect } from "@/components/SearchSelect";
import { Modal, ModalBody, ModalFooter } from "@/components/Modal";
import { useInvoicesApi } from "@/hooks/useInvoicesApi";
import { useFeeTemplatesApi } from "@/hooks/useFeeTemplatesApi";
import { useInvoiceAdjustmentsApi } from "@/hooks/useInvoiceAdjustmentsApi";
import { useAdjustmentsApi } from "@/hooks/useAdjustmentsApi";
import { usePaymentsApi } from "@/hooks/usePaymentsApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { useRefundsApi } from "@/hooks/useRefundsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const paymentMethods = [
  { value: "M-Pesa", label: "M-Pesa" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Cash", label: "Cash" },
  { value: "Cheque", label: "Cheque" },
  { value: "Airtel Money", label: "Airtel Money" },
];

const paymentSchema = yup.object({
  student_id: yup.string().required("Select a student"),
  amount: yup
    .number()
    .typeError("Amount is required")
    .positive("Must be positive")
    .required("Amount is required"),
  method: yup.string().required("Select a payment method"),
  reference: yup.string().trim().required("Payment reference is required"),
  payment_date: yup.string().required("Payment date is required"),
  notes: yup.string().nullable(),
});

const feeSchema = yup.object({
  fee_student_id: yup.string().required("Select a student"),
  fee_template_id: yup.string().required("Select a fee template"),
  fee_description: yup.string().nullable(),
});

const penaltySchema = yup.object({
  penalty_student_id: yup.string().required("Select a student"),
  penalty_amount: yup
    .number()
    .typeError("Amount is required")
    .positive("Must be positive")
    .required("Amount is required"),
  penalty_description: yup.string().nullable(),
});

const creditAdjustmentSchema = yup.object({
  ca_student_id: yup.string().required("Select a student"),
  ca_type: yup.string().oneOf(["discount", "waiver"]).required("Select type"),
  ca_invoice_id: yup.string().required("Select an invoice"),
  ca_amount: yup
    .number()
    .typeError("Amount is required")
    .positive("Must be positive")
    .required("Amount is required"),
  ca_description: yup.string().nullable(),
});

const reversalSchema = yup.object({
  rev_student_id: yup.string().required("Select a student"),
  rev_invoice_id: yup.string().required("Select an invoice"),
  rev_reason: yup.string().required("Reason is required"),
});

const refundSchema = yup.object({
  refund_student_id: yup.string().required("Select a student"),
  refund_reason: yup.string().nullable(),
  refund_invoice_id: yup.string().nullable(),
});

function formatCurrency(amount) {
  return `Ksh ${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ActionCard({ icon: Icon, title, description, gradientFrom, gradientTo, onClick }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div>
        <div
          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white shadow-sm`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="mt-3 text-[15px] font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-[13px] leading-5 text-slate-500">{description}</p>
      </div>
      <FormButton type="button" onClick={onClick} className="mt-4">
        Open
      </FormButton>
    </div>
  );
}

function SectionHeader({ label, count }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-[17px] font-semibold tracking-[-0.01em] text-slate-950">{label}</h2>
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-100 px-1.5 text-[11px] font-medium text-slate-500">
        {count}
      </span>
      <div className="ml-auto h-px flex-1 bg-gradient-to-r from-slate-100 to-transparent" />
    </div>
  );
}

export function BillingPage() {
  const navigate = useNavigate();
  const invoicesApi = useInvoicesApi();
  const paymentsApi = usePaymentsApi();
  const refundsApi = useRefundsApi();
  const lookupApi = useLookupApi();
  const invoiceAdjustmentsApi = useInvoiceAdjustmentsApi();
  const adjustmentsApi = useAdjustmentsApi();
  const feeTemplatesApi = useFeeTemplatesApi();

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState(false);
  const [isCreditAdjustmentModalOpen, setIsCreditAdjustmentModalOpen] = useState(false);
  const [isReversalModalOpen, setIsReversalModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

  const [selectedPaymentStudent, setSelectedPaymentStudent] = useState(null);
  const [selectedFeeStudent, setSelectedFeeStudent] = useState(null);
  const [selectedPenaltyStudent, setSelectedPenaltyStudent] = useState(null);
  const [selectedCaStudent, setSelectedCaStudent] = useState(null);
  const [selectedRevStudent, setSelectedRevStudent] = useState(null);
  const [selectedRefundStudent, setSelectedRefundStudent] = useState(null);

  const [refundCreditBalance, setRefundCreditBalance] = useState(0);
  const [isFetchingCredit, setIsFetchingCredit] = useState(false);

  const [feeTemplates, setFeeTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [caInvoices, setCaInvoices] = useState([]);
  const [revInvoices, setRevInvoices] = useState([]);

  const [revSelectedBalance, setRevSelectedBalance] = useState(0);
  const [isFetchingCaInvoices, setIsFetchingCaInvoices] = useState(false);
  const [isFetchingRevInvoices, setIsFetchingRevInvoices] = useState(false);

  async function fetchStudentCredit(studentId) {
    if (!studentId) {
      setRefundCreditBalance(0);
      return;
    }
    setIsFetchingCredit(true);
    try {
      const res = await invoicesApi.creditBalance(studentId);
      setRefundCreditBalance(res.data?.credit_balance ?? 0);
    } catch {
      setRefundCreditBalance(0);
    } finally {
      setIsFetchingCredit(false);
    }
  }

  async function fetchStudentInvoices(studentId) {
    if (!studentId) return [];
    const res = await invoicesApi.list({ student_id: studentId, per_page: 50 });
    return res.data ?? [];
  }

  function fetchStudents(query) {
    return lookupApi
      .search("students", { query, limit: 10 })
      .then((res) => res.data ?? [])
      .catch(() => []);
  }
  function fetchGraduatedStudents(query) {
    return lookupApi
      .search("students", { query, limit: 10, status: "graduated" })
      .then((res) => res.data ?? [])
      .catch(() => []);
  }

  useEffect(() => {
    let isMounted = true;
    setIsLoadingTemplates(true);
    feeTemplatesApi
      .list({ per_page: 100, status: "active" })
      .then((res) => {
        if (isMounted) setFeeTemplates(res.data ?? []);
      })
      .catch(() => {
        if (isMounted) setFeeTemplates([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingTemplates(false);
      });
    return () => { isMounted = false; };
  }, [feeTemplatesApi]);

  // --- Payment ---
  const paymentForm = useForm({
    resolver: yupResolver(paymentSchema),
    defaultValues: {
      student_id: "",
      amount: "",
      method: "",
      reference: "",
      payment_date: new Date().toISOString().slice(0, 10),
      notes: "",
    },
  });

  function resetPaymentForm() {
    paymentForm.reset({
      student_id: "",
      amount: "",
      method: "",
      reference: "",
      payment_date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
    setSelectedPaymentStudent(null);
    setFormError("");
  }

  function openPaymentModal() {
    resetPaymentForm();
    setIsPaymentModalOpen(true);
  }

  async function onSubmitPayment(data) {
    setIsSaving(true);
    setFormError("");
    try {
      await paymentsApi.store({
        student_id: data.student_id,
        amount: data.amount,
        method: data.method,
        reference: data.reference || null,
        payment_date: data.payment_date,
        notes: data.notes || null,
      });
      toast.success("Payment recorded successfully.");
      setIsPaymentModalOpen(false);

      const creditRes = await invoicesApi.creditBalance(data.student_id).catch(() => null);
      if (creditRes?.data?.credit_balance > 0 && selectedPaymentStudent?.status === "graduated") {
        resetRefundForm();
        refundForm.setValue("refund_student_id", data.student_id);
        setSelectedRefundStudent(selectedPaymentStudent);
        setIsRefundModalOpen(true);
        await fetchStudentCredit(data.student_id);
      }
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to record payment."));
    } finally {
      setIsSaving(false);
    }
  }

  // --- Fee (debit) ---
  const feeForm = useForm({
    resolver: yupResolver(feeSchema),
    defaultValues: { fee_student_id: "", fee_template_id: "", fee_description: "" },
  });

  function resetFeeForm() {
    feeForm.reset({ fee_student_id: "", fee_template_id: "", fee_description: "" });
    setSelectedFeeStudent(null);
    setFormError("");
  }

  function openFeeModal() {
    resetFeeForm();
    setIsFeeModalOpen(true);
  }

  async function onSubmitFee(data) {
    setIsSaving(true);
    setFormError("");
    try {
      await invoiceAdjustmentsApi.store({
        student_id: data.fee_student_id,
        fee_template_id: data.fee_template_id,
        description: data.fee_description || null,
      });
      toast.success("Invoice created successfully.");
      setIsFeeModalOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to create invoice."));
    } finally {
      setIsSaving(false);
    }
  }

  // --- Penalty (debit) ---
  const penaltyForm = useForm({
    resolver: yupResolver(penaltySchema),
    defaultValues: {
      penalty_student_id: "",
      penalty_amount: "",
      penalty_description: "",
    },
  });

  function resetPenaltyForm() {
    penaltyForm.reset({
      penalty_student_id: "",
      penalty_amount: "",
      penalty_description: "",
    });
    setSelectedPenaltyStudent(null);
    setFormError("");
  }

  function openPenaltyModal() {
    resetPenaltyForm();
    setIsPenaltyModalOpen(true);
  }

  function onPenaltyStudentChange(id, option) {
    penaltyForm.setValue("penalty_student_id", id, { shouldValidate: true });
    setSelectedPenaltyStudent(option ?? null);
  }

  async function onSubmitPenalty(data) {
    setIsSaving(true);
    setFormError("");
    try {
      await invoiceAdjustmentsApi.storeCharge({
        student_id: data.penalty_student_id,
        charge_type: "penalty",
        amount: data.penalty_amount,
        description: data.penalty_description || null,
      });
      toast.success("Penalty invoice created successfully.");
      setIsPenaltyModalOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to create penalty invoice."));
    } finally {
      setIsSaving(false);
    }
  }

  // --- Discount / Waiver (credit) ---
  const caForm = useForm({
    resolver: yupResolver(creditAdjustmentSchema),
    defaultValues: {
      ca_student_id: "",
      ca_type: "discount",
      ca_invoice_id: "",
      ca_amount: "",
      ca_description: "",
    },
  });

  function resetCaForm() {
    caForm.reset({
      ca_student_id: "",
      ca_type: "discount",
      ca_invoice_id: "",
      ca_amount: "",
      ca_description: "",
    });
    setSelectedCaStudent(null);
    setCaInvoices([]);
    setFormError("");
  }

  function openCaModal() {
    resetCaForm();
    setIsCreditAdjustmentModalOpen(true);
  }

  async function onCaStudentChange(id, option) {
    caForm.setValue("ca_student_id", id, { shouldValidate: true });
    caForm.setValue("ca_invoice_id", "");
    setSelectedCaStudent(option ?? null);
    if (id) {
      setIsFetchingCaInvoices(true);
      const list = await fetchStudentInvoices(id);
      setCaInvoices(list.filter((i) => i.status === "issued" || i.status === "partial"));
      setIsFetchingCaInvoices(false);
    } else {
      setCaInvoices([]);
    }
  }

  async function onSubmitCa(data) {
    setIsSaving(true);
    setFormError("");
    try {
      await adjustmentsApi.store(data.ca_invoice_id, {
        type: data.ca_type,
        amount: data.ca_amount,
        description: data.ca_description || null,
      });
      toast.success(`${data.ca_type === "discount" ? "Discount" : "Waiver"} applied successfully.`);
      setIsCreditAdjustmentModalOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to apply adjustment."));
    } finally {
      setIsSaving(false);
    }
  }

  // --- Invoice Reversal (credit) ---
  const revForm = useForm({
    resolver: yupResolver(reversalSchema),
    defaultValues: { rev_student_id: "", rev_invoice_id: "", rev_reason: "" },
  });

  function resetRevForm() {
    revForm.reset({ rev_student_id: "", rev_invoice_id: "", rev_reason: "" });
    setSelectedRevStudent(null);
    setRevInvoices([]);
    setRevSelectedBalance(0);
    setFormError("");
  }

  function openRevModal() {
    resetRevForm();
    setIsReversalModalOpen(true);
  }

  async function onRevStudentChange(id, option) {
    revForm.setValue("rev_student_id", id, { shouldValidate: true });
    revForm.setValue("rev_invoice_id", "");
    setSelectedRevStudent(option ?? null);
    if (id) {
      setIsFetchingRevInvoices(true);
      const list = await fetchStudentInvoices(id);
      setRevInvoices(list.filter((i) => i.status === "issued" || i.status === "partial"));
      setIsFetchingRevInvoices(false);
    } else {
      setRevInvoices([]);
    }
  }

  function onRevInvoiceChange(invoiceId) {
    revForm.setValue("rev_invoice_id", invoiceId, { shouldValidate: true });
    const inv = revInvoices.find((i) => i.id === invoiceId);
    setRevSelectedBalance(inv ? inv.balance_due ?? inv.amount_due : 0);
  }

  async function onSubmitRev(data) {
    setIsSaving(true);
    setFormError("");
    try {
      await adjustmentsApi.store(data.rev_invoice_id, {
        type: "reversal",
        amount: revSelectedBalance > 0 ? revSelectedBalance : undefined,
        description: data.rev_reason || null,
      });
      toast.success("Invoice reversed successfully.");
      setIsReversalModalOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to reverse invoice."));
    } finally {
      setIsSaving(false);
    }
  }

  // --- Refund ---
  const refundForm = useForm({
    resolver: yupResolver(refundSchema),
    defaultValues: { refund_student_id: "", refund_reason: "", refund_invoice_id: "" },
  });

  function resetRefundForm() {
    refundForm.reset({ refund_student_id: "", refund_reason: "", refund_invoice_id: "" });
    setSelectedRefundStudent(null);
    setRefundCreditBalance(0);
    setFormError("");
  }

  function openRefundModal() {
    resetRefundForm();
    setIsRefundModalOpen(true);
  }

  async function onSubmitRefund(data) {
    setIsSaving(true);
    setFormError("");
    try {
      await refundsApi.store({
        student_id: data.refund_student_id,
        reason: data.refund_reason || null,
        invoice_id: data.refund_invoice_id || null,
      });
      toast.success("Refund processed successfully.");
      setIsRefundModalOpen(false);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to process refund."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">
          Billing
        </h1>
        <p className="mt-1 text-[14px] text-slate-500">
          Manage student fees, payments, adjustments, and refunds.
        </p>
      </div>

      {/* DEBIT SECTION — What Students Owe */}
      <div>
        <SectionHeader label="Debit (Charge Student)" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ActionCard
            icon={Receipt}
            title="Issue Fee"
            description="Create a new fee invoice from a template. Adds a debit to the student account."
            gradientFrom="from-amber-500"
            gradientTo="to-amber-600"
            onClick={openFeeModal}
          />
          <ActionCard
            icon={AlertTriangle}
            title="Issue Penalty"
            description="Create a separate penalty or late-fee invoice for the student."
            gradientFrom="from-orange-500"
            gradientTo="to-orange-600"
            onClick={openPenaltyModal}
          />
        </div>
      </div>

      {/* CREDIT SECTION — What Reduces Balance */}
      <div>
        <SectionHeader label="Credit (Reduce Balance)" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ActionCard
            icon={Wallet}
            title="Record Payment"
            description="Record a student payment. Allocated automatically to outstanding invoices, oldest first."
            gradientFrom="from-blue-500"
            gradientTo="to-blue-600"
            onClick={openPaymentModal}
          />
          <ActionCard
            icon={Gift}
            title="Discount / Waiver"
            description="Apply a discount or waiver to reduce what a student owes on an invoice."
            gradientFrom="from-emerald-500"
            gradientTo="to-emerald-600"
            onClick={openCaModal}
          />
          <ActionCard
            icon={Undo2}
            title="Invoice Reversal"
            description="Reverse a wrong invoice. Removes the outstanding balance from the student account."
            gradientFrom="from-violet-500"
            gradientTo="to-violet-600"
            onClick={openRevModal}
          />
          <ActionCard
            icon={RotateCcw}
            title="Process Refund"
            description="Issue a refund against available credit. Student must have Graduated status."
            gradientFrom="from-rose-500"
            gradientTo="to-rose-600"
            onClick={openRefundModal}
          />
        </div>
      </div>

      {/* NAVIGATION */}
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => navigate("/finance/invoices")}
          className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
        >
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">View Invoices</h3>
            <p className="mt-0.5 text-[13px] leading-5 text-slate-500">Browse all student invoices with search and filters.</p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => navigate("/finance/payments")}
          className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
        >
          <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-sm">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-slate-900">View Payments</h3>
            <p className="mt-0.5 text-[13px] leading-5 text-slate-500">View payment history and track allocations.</p>
          </div>
        </button>
      </div>

      {/* ==================== MODALS ==================== */}

      {/* Record Payment Modal */}
      <Modal
        open={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Payment"
        description="Payments are automatically allocated to the oldest outstanding invoices first."
        size="lg"
      >
        <form id="payment-form" onSubmit={paymentForm.handleSubmit(onSubmitPayment)}>
          <ModalBody className="space-y-4">
            {formError ? (
              <div
                className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}
              >
                {formError}
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <LookupSelect
                label="Student"
                placeholder="Search by admission number or name"
                required
                value={paymentForm.watch("student_id")}
                selectedOption={selectedPaymentStudent}
                onChange={(id, option) => {
                  paymentForm.setValue("student_id", id, { shouldValidate: true });
                  setSelectedPaymentStudent(option ?? null);
                }}
                fetchOptions={fetchStudents}
                error={paymentForm.formState.errors.student_id?.message}
              />
              <FormInput
                id="payment-amount"
                label="Amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                error={paymentForm.formState.errors.amount?.message}
                {...paymentForm.register("amount")}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-600">
                  Payment Method <span className="text-red-400">*</span>
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  {...paymentForm.register("method")}
                >
                  <option value="">Select method</option>
                  {paymentMethods.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                {paymentForm.formState.errors.method?.message ? (
                  <p className="mt-1 text-sm text-red-600">
                    {paymentForm.formState.errors.method.message}
                  </p>
                ) : null}
              </div>
              <FormInput
                id="payment-reference"
                label="Reference"
                required
                placeholder="Transaction code or receipt number"
                error={paymentForm.formState.errors.reference?.message}
                {...paymentForm.register("reference")}
              />
              <FormInput
                id="payment-date"
                label="Payment Date"
                type="date"
                required
                error={paymentForm.formState.errors.payment_date?.message}
                {...paymentForm.register("payment_date")}
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">
                Notes
              </label>
              <textarea
                className="h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-[13px] placeholder:text-[#a8b6c7] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                placeholder="Optional notes..."
                {...paymentForm.register("notes")}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => setIsPaymentModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </FormButton>
            <FormButton type="submit" form="payment-form" disabled={isSaving}>
              {isSaving ? "Recording..." : "Record Payment"}
            </FormButton>
          </ModalFooter>
        </form>
      </Modal>

      {/* Issue Fee Modal */}
      <Modal
        open={isFeeModalOpen}
        onClose={() => setIsFeeModalOpen(false)}
        title="Issue Fee"
        description="Create a new fee invoice from a fee template. This adds a debit to the student account."
        size="lg"
      >
        <form id="fee-form" onSubmit={feeForm.handleSubmit(onSubmitFee)}>
          <ModalBody className="space-y-4">
            {formError ? (
              <div
                className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}
              >
                {formError}
              </div>
            ) : null}
            <LookupSelect
              label="Student"
              placeholder="Search by admission number or name"
              required
              value={feeForm.watch("fee_student_id")}
              onChange={(id, option) => {
                feeForm.setValue("fee_student_id", id, { shouldValidate: true });
                setSelectedFeeStudent(option ?? null);
              }}
              selectedOption={selectedFeeStudent}
              fetchOptions={fetchStudents}
              error={feeForm.formState.errors.fee_student_id?.message}
            />
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">
                Fee Template <span className="text-red-400">*</span>
              </label>
              <SearchSelect
                options={feeTemplates.map((t) => ({ ...t, label: `${t.code} - ${t.name}` }))}
                value={feeForm.watch("fee_template_id")}
                onChange={(id) => {
                  feeForm.setValue("fee_template_id", id, { shouldValidate: true });
                }}
                placeholder={isLoadingTemplates ? "Loading..." : "Search fee template"}
                emptyMessage="No fee templates found"
              />
              {feeForm.formState.errors.fee_template_id?.message ? (
                <p className="mt-1 text-sm text-red-600">
                  {feeForm.formState.errors.fee_template_id.message}
                </p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">
                Amount
              </label>
              <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-[14px] font-semibold text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                {(() => {
                  const tid = feeForm.watch("fee_template_id");
                  const tpl = feeTemplates.find((t) => t.id === tid);
                  return tpl ? formatCurrency(tpl.total_amount) : "Select a fee template";
                })()}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">
                Description
              </label>
              <textarea
                className="h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-[13px] placeholder:text-[#a8b6c7] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                placeholder="Reason for this fee..."
                {...feeForm.register("fee_description")}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => setIsFeeModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </FormButton>
            <FormButton type="submit" form="fee-form" disabled={isSaving}>
              {isSaving ? "Creating..." : "Issue Fee"}
            </FormButton>
          </ModalFooter>
        </form>
      </Modal>

      {/* Apply Penalty Modal */}
      <Modal
        open={isPenaltyModalOpen}
        onClose={() => setIsPenaltyModalOpen(false)}
        title="Issue Penalty Invoice"
        description="Create a separate penalty or late-fee invoice for the student."
        size="lg"
      >
        <form id="penalty-form" onSubmit={penaltyForm.handleSubmit(onSubmitPenalty)}>
          <ModalBody className="space-y-4">
            {formError ? (
              <div
                className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}
              >
                {formError}
              </div>
            ) : null}
            <LookupSelect
              label="Student"
              placeholder="Search by admission number or name"
              required
              value={penaltyForm.watch("penalty_student_id")}
              selectedOption={selectedPenaltyStudent}
              onChange={onPenaltyStudentChange}
              fetchOptions={fetchStudents}
              error={penaltyForm.formState.errors.penalty_student_id?.message}
            />
            <FormInput
              id="penalty-amount"
              label="Penalty Amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              error={penaltyForm.formState.errors.penalty_amount?.message}
              {...penaltyForm.register("penalty_amount")}
            />
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">
                Description
              </label>
              <textarea
                className="h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-[13px] placeholder:text-[#a8b6c7] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                placeholder="Reason for penalty..."
                {...penaltyForm.register("penalty_description")}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => setIsPenaltyModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </FormButton>
            <FormButton type="submit" form="penalty-form" disabled={isSaving}>
              {isSaving ? "Creating..." : "Create Penalty Invoice"}
            </FormButton>
          </ModalFooter>
        </form>
      </Modal>

      {/* Discount / Waiver Modal */}
      <Modal
        open={isCreditAdjustmentModalOpen}
        onClose={() => setIsCreditAdjustmentModalOpen(false)}
        title="Discount / Waiver"
        description="Apply a discount or waiver to reduce a student's outstanding balance on an invoice."
        size="lg"
      >
        <form id="ca-form" onSubmit={caForm.handleSubmit(onSubmitCa)}>
          <ModalBody className="space-y-4">
            {formError ? (
              <div
                className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}
              >
                {formError}
              </div>
            ) : null}
            <LookupSelect
              label="Student"
              placeholder="Search by admission number or name"
              required
              value={caForm.watch("ca_student_id")}
              selectedOption={selectedCaStudent}
              onChange={onCaStudentChange}
              fetchOptions={fetchStudents}
              error={caForm.formState.errors.ca_student_id?.message}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-600">
                  Type <span className="text-red-400">*</span>
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  {...caForm.register("ca_type")}
                >
                  <option value="discount">Discount</option>
                  <option value="waiver">Waiver</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-600">
                  Invoice <span className="text-red-400">*</span>
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  {...caForm.register("ca_invoice_id")}
                  disabled={isFetchingCaInvoices || caInvoices.length === 0}
                >
                  <option value="">
                    {isFetchingCaInvoices
                      ? "Loading invoices..."
                      : caInvoices.length === 0 && caForm.watch("ca_student_id")
                        ? "No outstanding invoices"
                        : "Select an invoice"}
                  </option>
                  {caInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoice_number} — {formatCurrency(inv.balance_due)} due
                    </option>
                  ))}
                </select>
                {caForm.formState.errors.ca_invoice_id?.message ? (
                  <p className="mt-1 text-sm text-red-600">
                    {caForm.formState.errors.ca_invoice_id.message}
                  </p>
                ) : null}
              </div>
            </div>
            <FormInput
              id="ca-amount"
              label="Amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="0.00"
              error={caForm.formState.errors.ca_amount?.message}
              {...caForm.register("ca_amount")}
            />
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">
                Description
              </label>
              <textarea
                className="h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-[13px] placeholder:text-[#a8b6c7] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                placeholder="Reason for this adjustment..."
                {...caForm.register("ca_description")}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => setIsCreditAdjustmentModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </FormButton>
            <FormButton type="submit" form="ca-form" disabled={isSaving}>
              {isSaving ? "Applying..." : "Apply"}
            </FormButton>
          </ModalFooter>
        </form>
      </Modal>

      {/* Invoice Reversal Modal */}
      <Modal
        open={isReversalModalOpen}
        onClose={() => setIsReversalModalOpen(false)}
        title="Invoice Reversal"
        description="Reverse a wrong invoice. The outstanding balance will be removed from the student account."
        size="lg"
      >
        <form id="rev-form" onSubmit={revForm.handleSubmit(onSubmitRev)}>
          <ModalBody className="space-y-4">
            {formError ? (
              <div
                className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}
              >
                {formError}
              </div>
            ) : null}
            <LookupSelect
              label="Student"
              placeholder="Search by admission number or name"
              required
              value={revForm.watch("rev_student_id")}
              selectedOption={selectedRevStudent}
              onChange={onRevStudentChange}
              fetchOptions={fetchStudents}
              error={revForm.formState.errors.rev_student_id?.message}
            />
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">
                Invoice <span className="text-red-400">*</span>
              </label>
              <select
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                value={revForm.watch("rev_invoice_id")}
                onChange={(e) => onRevInvoiceChange(e.target.value)}
                disabled={isFetchingRevInvoices || revInvoices.length === 0}
              >
                <option value="">
                  {isFetchingRevInvoices
                    ? "Loading invoices..."
                    : revInvoices.length === 0 && revForm.watch("rev_student_id")
                      ? "No invoices found"
                      : "Select an invoice"}
                </option>
                {revInvoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} — {formatCurrency(inv.balance_due)} outstanding
                  </option>
                ))}
              </select>
              {revForm.formState.errors.rev_invoice_id?.message ? (
                <p className="mt-1 text-sm text-red-600">
                  {revForm.formState.errors.rev_invoice_id.message}
                </p>
              ) : null}
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">
                Reversal Amount
              </label>
              <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-[14px] font-semibold text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                {revSelectedBalance > 0 ? formatCurrency(revSelectedBalance) : "Select an invoice"}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">
                Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                className="h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-[13px] placeholder:text-[#a8b6c7] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                placeholder="Reason for reversal..."
                {...revForm.register("rev_reason")}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => setIsReversalModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </FormButton>
            <FormButton type="submit" form="rev-form" disabled={isSaving}>
              {isSaving ? "Reversing..." : "Reverse Invoice"}
            </FormButton>
          </ModalFooter>
        </form>
      </Modal>

      {/* Process Refund Modal */}
      <Modal
        open={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        title="Process Refund"
        description="Issue a refund against a student's available credit balance."
        size="lg"
      >
        <form id="refund-form" onSubmit={refundForm.handleSubmit(onSubmitRefund)}>
          <ModalBody className="space-y-4">
            {formError ? (
              <div
                className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}
              >
                {formError}
              </div>
            ) : null}
            <LookupSelect
              label="Student"
              placeholder="Search graduated student by admission number or name"
              required
              value={refundForm.watch("refund_student_id")}
              selectedOption={selectedRefundStudent}
              onChange={(id, option) => {
                refundForm.setValue("refund_student_id", id, { shouldValidate: true });
                setSelectedRefundStudent(option ?? null);
                if (option?.status === "graduated") {
                  fetchStudentCredit(id);
                } else {
                  setRefundCreditBalance(0);
                }
              }}
              fetchOptions={fetchGraduatedStudents}
              error={refundForm.formState.errors.refund_student_id?.message}
            />
            {selectedRefundStudent?.status === "graduated" ? (
              <>
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
                  <p className="text-[13px] text-sky-700">
                    Available Credit:{" "}
                    <span className="font-semibold">
                      {isFetchingCredit ? "Loading..." : formatCurrency(refundCreditBalance)}
                    </span>
                  </p>
                  {refundCreditBalance <= 0 && !isFetchingCredit ? (
                    <p className="mt-1 text-[12px] text-sky-600">
                      This student has no available credit to refund.
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600">
                    Refund Amount
                  </label>
                  <div className="flex h-9 items-center rounded-lg border border-slate-200 bg-slate-50 px-4 text-[14px] font-semibold text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    {isFetchingCredit
                      ? "Calculating..."
                      : refundCreditBalance > 0
                        ? formatCurrency(refundCreditBalance)
                        : "No credit available"}
                  </div>
                </div>
                <FormInput
                  id="refund-invoice"
                  label="Invoice (optional)"
                  placeholder="Leave blank for general refund"
                  error={refundForm.formState.errors.refund_invoice_id?.message}
                  {...refundForm.register("refund_invoice_id")}
                />
                <div>
                  <label className="mb-1 block text-[13px] font-medium text-slate-600">
                    Reason
                  </label>
                  <textarea
                    className="h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-[13px] placeholder:text-[#a8b6c7] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    placeholder="Reason for refund..."
                    {...refundForm.register("refund_reason")}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[13px] text-slate-600">
                  Refund details are available only after selecting a student marked <strong>Graduated</strong>.
                </p>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => setIsRefundModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </FormButton>
            {selectedRefundStudent?.status === "graduated" ? (
              <FormButton
                type="submit"
                form="refund-form"
                disabled={isSaving || refundCreditBalance <= 0}
              >
                {isSaving ? "Processing..." : "Process Refund"}
              </FormButton>
            ) : null}
          </ModalFooter>
        </form>
      </Modal>
    </section>
  );
}

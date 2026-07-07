import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { AlertTriangle, Eye, Gift, Receipt, RotateCcw, Undo2, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import * as yup from "yup";

import { BillingActionTabs } from "./BillingActionTabs";
import { BillingCreditAdjustmentForm } from "./BillingCreditAdjustmentForm";
import { BillingFeeForm } from "./BillingFeeForm";
import { BillingPaymentForm } from "./BillingPaymentForm";
import { BillingPenaltyForm } from "./BillingPenaltyForm";
import { BillingRefundForm } from "./BillingRefundForm";
import { BillingReversalForm } from "./BillingReversalForm";
import { useInvoicesApi } from "@/hooks/useInvoicesApi";
import { useFeeTemplatesApi } from "@/hooks/useFeeTemplatesApi";
import { useInvoiceAdjustmentsApi } from "@/hooks/useInvoiceAdjustmentsApi";
import { useAdjustmentsApi } from "@/hooks/useAdjustmentsApi";
import { usePaymentsApi } from "@/hooks/usePaymentsApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { useRefundsApi } from "@/hooks/useRefundsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const billingActions = [
  {
    id: "payment",
    group: "Credit",
    icon: Wallet,
    title: "Record Payment",
    description: "Record a student payment. Allocated automatically to outstanding invoices, oldest first.",
  },
  {
    id: "fee",
    group: "Debit",
    icon: Receipt,
    title: "Issue Fee",
    description: "Create a new fee invoice from a template. Adds a debit to the student account.",
  },
  {
    id: "penalty",
    group: "Debit",
    icon: AlertTriangle,
    title: "Issue Penalty",
    description: "Create a separate penalty or late-fee invoice for the student.",
  },
  {
    id: "adjustment",
    group: "Credit",
    icon: Gift,
    title: "Discount / Waiver",
    description: "Apply a discount or waiver to reduce what a student owes on an invoice.",
  },
  {
    id: "reversal",
    group: "Credit",
    icon: Undo2,
    title: "Invoice Reversal",
    description: "Reverse a wrong invoice. Removes the outstanding balance from the student account.",
  },
  {
    id: "refund",
    group: "Credit",
    icon: RotateCcw,
    title: "Process Refund",
    description: "Issue a refund against available credit. Student must have Graduated status.",
  },
];

const paymentSchema = yup.object({
  student_id: yup.string().required("Select a student"),
  amount: yup.number().typeError("Amount is required").positive("Must be positive").required("Amount is required"),
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
  penalty_amount: yup.number().typeError("Amount is required").positive("Must be positive").required("Amount is required"),
  penalty_description: yup.string().nullable(),
});

const creditAdjustmentSchema = yup.object({
  ca_student_id: yup.string().required("Select a student"),
  ca_type: yup.string().oneOf(["discount", "waiver"]).required("Select type"),
  ca_invoice_id: yup.string().required("Select an invoice"),
  ca_amount: yup.number().typeError("Amount is required").positive("Must be positive").required("Amount is required"),
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

function getToday() {
  return new Date().toISOString().slice(0, 10);
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

  const [activeAction, setActiveAction] = useState("payment");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [selectedPaymentStudent, setSelectedPaymentStudent] = useState(null);
  const [selectedFeeStudent, setSelectedFeeStudent] = useState(null);
  const [selectedPenaltyStudent, setSelectedPenaltyStudent] = useState(null);
  const [selectedCaStudent, setSelectedCaStudent] = useState(null);
  const [selectedRevStudent, setSelectedRevStudent] = useState(null);
  const [selectedRefundStudent, setSelectedRefundStudent] = useState(null);

  const [refundCreditBalance, setRefundCreditBalance] = useState(0);
  const [isFetchingCredit, setIsFetchingCredit] = useState(false);
  const [feeTemplates, setFeeTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [caInvoices, setCaInvoices] = useState([]);
  const [revInvoices, setRevInvoices] = useState([]);
  const [revSelectedBalance, setRevSelectedBalance] = useState(0);
  const [isFetchingCaInvoices, setIsFetchingCaInvoices] = useState(false);
  const [isFetchingRevInvoices, setIsFetchingRevInvoices] = useState(false);

  const paymentForm = useForm({
    resolver: yupResolver(paymentSchema),
    defaultValues: { student_id: "", amount: "", method: "", reference: "", payment_date: getToday(), notes: "" },
  });
  const feeForm = useForm({
    resolver: yupResolver(feeSchema),
    defaultValues: { fee_student_id: "", fee_template_id: "", fee_description: "" },
  });
  const penaltyForm = useForm({
    resolver: yupResolver(penaltySchema),
    defaultValues: { penalty_student_id: "", penalty_amount: "", penalty_description: "" },
  });
  const caForm = useForm({
    resolver: yupResolver(creditAdjustmentSchema),
    defaultValues: { ca_student_id: "", ca_type: "discount", ca_invoice_id: "", ca_amount: "", ca_description: "" },
  });
  const revForm = useForm({
    resolver: yupResolver(reversalSchema),
    defaultValues: { rev_student_id: "", rev_invoice_id: "", rev_reason: "" },
  });
  const refundForm = useForm({
    resolver: yupResolver(refundSchema),
    defaultValues: { refund_student_id: "", refund_reason: "", refund_invoice_id: "" },
  });

  useEffect(() => {
    let isMounted = true;
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
    return () => {
      isMounted = false;
    };
  }, [feeTemplatesApi]);

  function fetchStudents(query) {
    return lookupApi.search("students", { query, limit: 10 }).then((res) => res.data ?? []).catch(() => []);
  }

  function fetchGraduatedStudents(query) {
    return lookupApi.search("students", { query, limit: 10, status: "graduated" }).then((res) => res.data ?? []).catch(() => []);
  }

  async function fetchStudentInvoices(studentId) {
    if (!studentId) return [];
    const res = await invoicesApi.list({ student_id: studentId, per_page: 50 });
    return res.data ?? [];
  }

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

  function resetPaymentForm() {
    paymentForm.reset({ student_id: "", amount: "", method: "", reference: "", payment_date: getToday(), notes: "" });
    setSelectedPaymentStudent(null);
    setFormError("");
  }

  function resetFeeForm() {
    feeForm.reset({ fee_student_id: "", fee_template_id: "", fee_description: "" });
    setSelectedFeeStudent(null);
    setFormError("");
  }

  function resetPenaltyForm() {
    penaltyForm.reset({ penalty_student_id: "", penalty_amount: "", penalty_description: "" });
    setSelectedPenaltyStudent(null);
    setFormError("");
  }

  function resetCaForm() {
    caForm.reset({ ca_student_id: "", ca_type: "discount", ca_invoice_id: "", ca_amount: "", ca_description: "" });
    setSelectedCaStudent(null);
    setCaInvoices([]);
    setFormError("");
  }

  function resetRevForm() {
    revForm.reset({ rev_student_id: "", rev_invoice_id: "", rev_reason: "" });
    setSelectedRevStudent(null);
    setRevInvoices([]);
    setRevSelectedBalance(0);
    setFormError("");
  }

  function resetRefundForm() {
    refundForm.reset({ refund_student_id: "", refund_reason: "", refund_invoice_id: "" });
    setSelectedRefundStudent(null);
    setRefundCreditBalance(0);
    setFormError("");
  }

  function openAction(actionId) {
    const resetters = {
      payment: resetPaymentForm,
      fee: resetFeeForm,
      penalty: resetPenaltyForm,
      adjustment: resetCaForm,
      reversal: resetRevForm,
      refund: resetRefundForm,
    };
    resetters[actionId]?.();
    setActiveAction(actionId);
  }

  function closeActiveForm() {
    setActiveAction(null);
    setFormError("");
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
      closeActiveForm();

      const creditRes = await invoicesApi.creditBalance(data.student_id).catch(() => null);
      if (creditRes?.data?.credit_balance > 0 && selectedPaymentStudent?.status === "graduated") {
        resetRefundForm();
        refundForm.setValue("refund_student_id", data.student_id);
        setSelectedRefundStudent(selectedPaymentStudent);
        setActiveAction("refund");
        await fetchStudentCredit(data.student_id);
      }
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to record payment."));
    } finally {
      setIsSaving(false);
    }
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
      closeActiveForm();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to create invoice."));
    } finally {
      setIsSaving(false);
    }
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
      closeActiveForm();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to create penalty invoice."));
    } finally {
      setIsSaving(false);
    }
  }

  async function onCaStudentChange(id, option) {
    caForm.setValue("ca_student_id", id, { shouldValidate: true });
    caForm.setValue("ca_invoice_id", "");
    setSelectedCaStudent(option ?? null);
    if (id) {
      setIsFetchingCaInvoices(true);
      const list = await fetchStudentInvoices(id);
      setCaInvoices(list.filter((invoice) => invoice.status === "issued" || invoice.status === "partial"));
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
      closeActiveForm();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to apply adjustment."));
    } finally {
      setIsSaving(false);
    }
  }

  async function onRevStudentChange(id, option) {
    revForm.setValue("rev_student_id", id, { shouldValidate: true });
    revForm.setValue("rev_invoice_id", "");
    setSelectedRevStudent(option ?? null);
    if (id) {
      setIsFetchingRevInvoices(true);
      const list = await fetchStudentInvoices(id);
      setRevInvoices(list.filter((invoice) => invoice.status === "issued" || invoice.status === "partial"));
      setIsFetchingRevInvoices(false);
    } else {
      setRevInvoices([]);
    }
  }

  function onRevInvoiceChange(invoiceId) {
    revForm.setValue("rev_invoice_id", invoiceId, { shouldValidate: true });
    const invoice = revInvoices.find((item) => item.id === invoiceId);
    setRevSelectedBalance(invoice ? invoice.balance_due ?? invoice.amount_due : 0);
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
      closeActiveForm();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to reverse invoice."));
    } finally {
      setIsSaving(false);
    }
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
      closeActiveForm();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to process refund."));
    } finally {
      setIsSaving(false);
    }
  }

  const actionById = Object.fromEntries(billingActions.map((action) => [action.id, action]));
  const activeActionConfig = activeAction ? actionById[activeAction] : null;

  function renderActiveForm() {
    if (!activeActionConfig) {
      return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
          <p className="text-[14px] font-medium text-slate-700">Select a billing action above to open its form.</p>
        </div>
      );
    }

    switch (activeAction) {
      case "payment":
        return (
          <BillingPaymentForm
            action={activeActionConfig}
            form={paymentForm}
            onSubmit={onSubmitPayment}
            onCancel={closeActiveForm}
            isSaving={isSaving}
            formError={formError}
            selectedStudent={selectedPaymentStudent}
            setSelectedStudent={setSelectedPaymentStudent}
            fetchStudents={fetchStudents}
          />
        );
      case "fee":
        return (
          <BillingFeeForm
            action={activeActionConfig}
            form={feeForm}
            onSubmit={onSubmitFee}
            onCancel={closeActiveForm}
            isSaving={isSaving}
            formError={formError}
            selectedStudent={selectedFeeStudent}
            setSelectedStudent={setSelectedFeeStudent}
            fetchStudents={fetchStudents}
            feeTemplates={feeTemplates}
            isLoadingTemplates={isLoadingTemplates}
            formatCurrency={formatCurrency}
          />
        );
      case "penalty":
        return (
          <BillingPenaltyForm
            action={activeActionConfig}
            form={penaltyForm}
            onSubmit={onSubmitPenalty}
            onCancel={closeActiveForm}
            isSaving={isSaving}
            formError={formError}
            selectedStudent={selectedPenaltyStudent}
            onStudentChange={onPenaltyStudentChange}
            fetchStudents={fetchStudents}
          />
        );
      case "adjustment":
        return (
          <BillingCreditAdjustmentForm
            action={activeActionConfig}
            form={caForm}
            onSubmit={onSubmitCa}
            onCancel={closeActiveForm}
            isSaving={isSaving}
            formError={formError}
            selectedStudent={selectedCaStudent}
            onStudentChange={onCaStudentChange}
            fetchStudents={fetchStudents}
            invoices={caInvoices}
            isFetchingInvoices={isFetchingCaInvoices}
            formatCurrency={formatCurrency}
          />
        );
      case "reversal":
        return (
          <BillingReversalForm
            action={activeActionConfig}
            form={revForm}
            onSubmit={onSubmitRev}
            onCancel={closeActiveForm}
            isSaving={isSaving}
            formError={formError}
            selectedStudent={selectedRevStudent}
            onStudentChange={onRevStudentChange}
            fetchStudents={fetchStudents}
            invoices={revInvoices}
            selectedBalance={revSelectedBalance}
            isFetchingInvoices={isFetchingRevInvoices}
            onInvoiceChange={onRevInvoiceChange}
            formatCurrency={formatCurrency}
          />
        );
      case "refund":
        return (
          <BillingRefundForm
            action={activeActionConfig}
            form={refundForm}
            onSubmit={onSubmitRefund}
            onCancel={closeActiveForm}
            isSaving={isSaving}
            formError={formError}
            selectedStudent={selectedRefundStudent}
            setSelectedStudent={setSelectedRefundStudent}
            fetchGraduatedStudents={fetchGraduatedStudents}
            fetchStudentCredit={fetchStudentCredit}
            creditBalance={refundCreditBalance}
            isFetchingCredit={isFetchingCredit}
            setCreditBalance={setRefundCreditBalance}
            formatCurrency={formatCurrency}
          />
        );
      default:
        return null;
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">Billing</h1>
          <p className="mt-1 text-[14px] text-slate-500">Manage student fees, payments, adjustments, and refunds.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin/finance/invoices")}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <Eye className="h-4 w-4" />
            View Invoices
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/finance/payments")}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <Wallet className="h-4 w-4" />
            View Payments
          </button>
        </div>
      </div>

      <BillingActionTabs actions={billingActions} activeAction={activeAction} onSelect={openAction} />

      {renderActiveForm()}
    </section>
  );
}





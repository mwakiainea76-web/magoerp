import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { FileText, Percent, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import * as yup from "yup";

import { bodyTextClassName, initialMeta } from "@/lib/styles";
import {
  Table,
  TableFooter,
  TableHeader,
  TableWrapper,
  Tbody,
  Td,
  Th,
  Thead,
} from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { LookupSelect } from "@/components/LookupSelect";
import { Modal, ModalBody, ModalFooter } from "@/components/Modal";
import { useInvoicesApi } from "@/hooks/useInvoicesApi";
import { usePaymentsApi } from "@/hooks/usePaymentsApi";
import { useAdjustmentsApi } from "@/hooks/useAdjustmentsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const paymentMethods = [
  { value: "M-Pesa", label: "M-Pesa" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Cash", label: "Cash" },
  { value: "Cheque", label: "Cheque" },
  { value: "Airtel Money", label: "Airtel Money" },
];

const adjustmentTypes = [
  { value: "discount", label: "Discount" },
  { value: "waiver", label: "Waiver" },
  { value: "bursary", label: "Bursary" },
  { value: "helb", label: "HELB" },
];

const invoiceSchema = yup.object({
  student_id: yup.string().required("Select a student"),
  invoice_template_id: yup.string().required("Select an invoice template"),
});

const paymentSchema = yup.object({
  invoice_id: yup.string().required("Select an invoice"),
  amount: yup
    .number()
    .typeError("Amount is required")
    .positive("Must be positive")
    .required("Amount is required"),
  method: yup.string().required("Select a payment method"),
  reference: yup.string().nullable(),
  payment_date: yup.string().nullable(),
  notes: yup.string().nullable(),
});

const adjustmentSchema = yup.object({
  adjustment_invoice_id: yup.string().required("Select an invoice"),
  type: yup.string().required("Select adjustment type"),
  amount: yup
    .number()
    .typeError("Amount is required")
    .positive("Must be positive")
    .required("Amount is required"),
  description: yup.string().nullable(),
});

function formatCurrency(amount) {
  return `Ksh ${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function StatusBadge({ status }) {
  const styles = {
    issued: "bg-blue-50 text-blue-700 border-blue-200",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
    partial: "bg-amber-50 text-amber-700 border-amber-200",
    cancelled: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${
        styles[status] ?? "bg-slate-50 text-slate-600 border-slate-200"
      }`}
    >
      {status}
    </span>
  );
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

export function BillingPage() {
  const invoicesApi = useInvoicesApi();
  const paymentsApi = usePaymentsApi();
  const adjustmentsApi = useAdjustmentsApi();

  const [invoices, setInvoices] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedInvoiceTemplate, setSelectedInvoiceTemplate] = useState(null);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [selectedPaymentInvoice, setSelectedPaymentInvoice] = useState(null);
  const [selectedAdjustmentInvoice, setSelectedAdjustmentInvoice] = useState(null);

  function fetchStudents(query) {
    return invoicesApi
      .list({ q: query, per_page: 20 })
      .then((res) => {
        const seen = new Set();
        const unique = (res.data ?? []).filter((s) => {
          if (seen.has(s.student_id)) return false;
          seen.add(s.student_id);
          return true;
        });
        return unique.map((s) => ({
          id: s.student_id,
          label: `${s.admission_number} - ${s.student_name}`,
        }));
      })
      .catch(() => []);
  }

  function fetchInvoices(query) {
    return invoicesApi
      .list({ q: query, per_page: 20 })
      .then((res) =>
        (res.data ?? []).map((i) => ({
          id: i.id,
          label: `${i.invoice_number} - ${i.student_name} (${formatCurrency(i.balance_due)})`,
        })),
      )
      .catch(() => []);
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInvoices() {
      setIsLoading(true);

      try {
        const response = await invoicesApi.list({
          page,
          per_page: perPage,
          sort_by: "created_at",
          sort_direction: "desc",
        });

        if (isMounted) {
          setInvoices(response.data ?? []);
          setMeta(response.meta ?? initialMeta);
        }
      } catch {
        if (isMounted) {
          setInvoices([]);
          setMeta(initialMeta);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInvoices();

    return () => {
      isMounted = false;
    };
  }, [invoicesApi, page, perPage]);

  const invoiceForm = useForm({
    resolver: yupResolver(invoiceSchema),
    defaultValues: { student_id: "", invoice_template_id: "" },
  });

  const paymentForm = useForm({
    resolver: yupResolver(paymentSchema),
    defaultValues: {
      invoice_id: "",
      amount: "",
      method: "",
      reference: "",
      payment_date: "",
      notes: "",
    },
  });

  const adjustmentForm = useForm({
    resolver: yupResolver(adjustmentSchema),
    defaultValues: {
      adjustment_invoice_id: "",
      type: "",
      amount: "",
      description: "",
    },
  });

  function resetInvoiceForm() {
    invoiceForm.reset({ student_id: "", invoice_template_id: "" });
    setSelectedStudent(null);
    setSelectedInvoiceTemplate(null);
    setAvailableTemplates([]);
    setFormError("");
  }

  function resetPaymentForm() {
    paymentForm.reset({
      invoice_id: "",
      amount: "",
      method: "",
      reference: "",
      payment_date: "",
      notes: "",
    });
    setSelectedPaymentInvoice(null);
    setFormError("");
  }

  function resetAdjustmentForm() {
    adjustmentForm.reset({
      adjustment_invoice_id: "",
      type: "",
      amount: "",
      description: "",
    });
    setSelectedAdjustmentInvoice(null);
    setFormError("");
  }

  function openInvoiceModal() {
    resetInvoiceForm();
    setIsInvoiceModalOpen(true);
  }

  function openPaymentModal() {
    resetPaymentForm();
    setIsPaymentModalOpen(true);
  }

  function openAdjustmentModal() {
    resetAdjustmentForm();
    setIsAdjustmentModalOpen(true);
  }

  async function onStudentSelected(studentId) {
    invoiceForm.setValue("student_id", studentId, { shouldValidate: true });
    invoiceForm.setValue("invoice_template_id", "");
    setSelectedInvoiceTemplate(null);
    setAvailableTemplates([]);

    if (!studentId) return;

    setIsLoadingTemplates(true);

    try {
      const res = await invoicesApi.availableTemplates(studentId);
      const templates = (res.data ?? []).map((t) => ({
        id: t.id,
        invoice_template_id: t.invoice_template_id,
        label: `${t.template_code} - ${t.template_name} (${formatCurrency(t.total_amount)})${t.year_level ? ` - Year ${t.year_level}` : ""}${t.session_number ? ` - Session ${t.session_number}` : ""}`,
      }));
      setAvailableTemplates(templates);
    } catch {
      setAvailableTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  }

  async function onSubmitInvoice(data) {
    setIsSaving(true);
    setFormError("");

    try {
      await invoicesApi.create({
        student_id: data.student_id,
        invoice_template_id: data.invoice_template_id,
      });
      toast.success("Invoice issued successfully.");
      setIsInvoiceModalOpen(false);
      setPage(1);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to issue invoice."));
    } finally {
      setIsSaving(false);
    }
  }

  async function onSubmitPayment(data) {
    setIsSaving(true);
    setFormError("");

    try {
      await paymentsApi.store({
        invoice_id: data.invoice_id,
        amount: data.amount,
        method: data.method,
        reference: data.reference || null,
        payment_date: data.payment_date || null,
        notes: data.notes || null,
      });
      toast.success("Payment recorded successfully.");
      setIsPaymentModalOpen(false);
      setPage(1);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to record payment."));
    } finally {
      setIsSaving(false);
    }
  }

  async function onSubmitAdjustment(data) {
    setIsSaving(true);
    setFormError("");

    try {
      await adjustmentsApi.store(data.adjustment_invoice_id, {
        type: data.type,
        amount: data.amount,
        description: data.description || null,
      });
      toast.success("Adjustment applied successfully.");
      setIsAdjustmentModalOpen(false);
      setPage(1);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to apply adjustment."));
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
          Manage invoices, record payments, and apply fee waivers or discounts.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActionCard
          icon={FileText}
          title="Issue Invoice"
          description="Generate a new fee invoice for a student based on their enrolled course template."
          gradientFrom="from-emerald-500"
          gradientTo="to-emerald-600"
          onClick={openInvoiceModal}
        />
        <ActionCard
          icon={Wallet}
          title="Record Payment"
          description="Record a payment received from a student and allocate it to an invoice."
          gradientFrom="from-blue-500"
          gradientTo="to-blue-600"
          onClick={openPaymentModal}
        />
        <ActionCard
          icon={Percent}
          title="Fee Waivers"
          description="Apply discounts, waivers, bursaries, or HELB adjustments to an invoice."
          gradientFrom="from-amber-500"
          gradientTo="to-amber-600"
          onClick={openAdjustmentModal}
        />
      </div>

      <Table>
        <TableHeader>
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">
            Recent Invoices
          </h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
            Loading invoices...
          </div>
        ) : (
          <>
            <TableWrapper>
              <Thead>
                <tr>
                  <Th>Invoice #</Th>
                  <Th>Student</Th>
                  <Th>Session</Th>
                  <Th>Amount</Th>
                  <Th>Paid</Th>
                  <Th>Balance</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                </tr>
              </Thead>
              <Tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <Td
                      className={`px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}
                      colSpan={8}
                    >
                      No invoices found
                    </Td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id}>
                      <Td className="font-medium text-slate-900">
                        {inv.invoice_number}
                      </Td>
                      <Td>
                        <div className="flex flex-col">
                          <span className="text-slate-900">{inv.student_name}</span>
                          <span className="text-[12px] text-slate-400">
                            {inv.admission_number}
                          </span>
                        </div>
                      </Td>
                      <Td>{inv.session_name ?? "-"}</Td>
                      <Td>{formatCurrency(inv.amount_due)}</Td>
                      <Td>{formatCurrency(inv.paid_amount)}</Td>
                      <Td className="font-medium">
                        {inv.balance_due > 0 ? (
                          <span className="text-red-600">
                            {formatCurrency(inv.balance_due)}
                          </span>
                        ) : (
                          <span className="text-emerald-600">
                            {formatCurrency(inv.balance_due)}
                          </span>
                        )}
                      </Td>
                      <Td>
                        <StatusBadge status={inv.status} />
                      </Td>
                      <Td className="text-slate-500">
                        {inv.issue_date ?? "-"}
                      </Td>
                    </tr>
                  ))
                )}
              </Tbody>
            </TableWrapper>

            <TableFooter>
              <PaginationFooter
                page={page}
                perPage={perPage}
                total={meta.total}
                lastPage={meta.last_page}
                onPageChange={setPage}
                onPerPageChange={setPerPage}
              />
            </TableFooter>
          </>
        )}
      </Table>

      {/* Issue Invoice Modal */}
      <Modal
        open={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        title="Issue Invoice"
        description="Select a student and invoice template to generate a new fee invoice."
        size="md"
      >
        <form id="invoice-form" onSubmit={invoiceForm.handleSubmit(onSubmitInvoice)}>
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
              value={invoiceForm.watch("student_id")}
              onChange={onStudentSelected}
              selectedOption={selectedStudent}
              fetchOptions={fetchStudents}
              error={invoiceForm.formState.errors.student_id?.message}
            />

            {invoiceForm.watch("student_id") ? (
              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-600">
                  Invoice Template <span className="text-red-400">*</span>
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-slate-50 disabled:text-slate-400"
                  disabled={isLoadingTemplates}
                  {...invoiceForm.register("invoice_template_id")}
                >
                  <option value="">
                    {isLoadingTemplates
                      ? "Loading templates..."
                      : availableTemplates.length === 0
                        ? "No templates available"
                        : "Select a template"}
                  </option>
                  {availableTemplates.map((t) => (
                    <option key={t.id} value={t.invoice_template_id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {invoiceForm.formState.errors.invoice_template_id?.message ? (
                  <p className="mt-1 text-sm text-red-600">
                    {invoiceForm.formState.errors.invoice_template_id.message}
                  </p>
                ) : null}
              </div>
            ) : null}
          </ModalBody>
          <ModalFooter>
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => setIsInvoiceModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </FormButton>
            <FormButton type="submit" form="invoice-form" disabled={isSaving}>
              {isSaving ? "Issuing..." : "Issue Invoice"}
            </FormButton>
          </ModalFooter>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        open={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Payment"
        description="Record a payment received from a student."
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

            <LookupSelect
              label="Invoice"
              placeholder="Search by invoice number or student name"
              required
              value={paymentForm.watch("invoice_id")}
              onChange={(id) => {
                paymentForm.setValue("invoice_id", id, { shouldValidate: true });
              }}
              selectedOption={selectedPaymentInvoice}
              fetchOptions={fetchInvoices}
              error={paymentForm.formState.errors.invoice_id?.message}
            />

            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormInput
                id="payment-reference"
                label="Reference"
                placeholder="Transaction code (optional)"
                error={paymentForm.formState.errors.reference?.message}
                {...paymentForm.register("reference")}
              />
              <FormInput
                id="payment-date"
                label="Payment Date"
                type="date"
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

      {/* Fee Waiver Modal */}
      <Modal
        open={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title="Fee Waiver"
        description="Apply a discount, waiver, bursary, or HELB adjustment to an invoice."
        size="lg"
      >
        <form id="adjustment-form" onSubmit={adjustmentForm.handleSubmit(onSubmitAdjustment)}>
          <ModalBody className="space-y-4">
            {formError ? (
              <div
                className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}
              >
                {formError}
              </div>
            ) : null}

            <LookupSelect
              label="Invoice"
              placeholder="Search by invoice number or student name"
              required
              value={adjustmentForm.watch("adjustment_invoice_id")}
              onChange={(id) => {
                adjustmentForm.setValue("adjustment_invoice_id", id, { shouldValidate: true });
              }}
              selectedOption={selectedAdjustmentInvoice}
              fetchOptions={fetchInvoices}
              error={adjustmentForm.formState.errors.adjustment_invoice_id?.message}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-600">
                  Adjustment Type <span className="text-red-400">*</span>
                </label>
                <select
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                  {...adjustmentForm.register("type")}
                >
                  <option value="">Select type</option>
                  {adjustmentTypes.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                {adjustmentForm.formState.errors.type?.message ? (
                  <p className="mt-1 text-sm text-red-600">
                    {adjustmentForm.formState.errors.type.message}
                  </p>
                ) : null}
              </div>

              <FormInput
                id="adjustment-amount"
                label="Amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                error={adjustmentForm.formState.errors.amount?.message}
                {...adjustmentForm.register("amount")}
              />
            </div>

            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-600">
                Description
              </label>
              <textarea
                className="h-24 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition placeholder:text-[13px] placeholder:text-[#a8b6c7] focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                placeholder="Reason for adjustment..."
                {...adjustmentForm.register("description")}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <FormButton
              type="button"
              variant="secondary"
              onClick={() => setIsAdjustmentModalOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </FormButton>
            <FormButton type="submit" form="adjustment-form" disabled={isSaving}>
              {isSaving ? "Applying..." : "Apply Adjustment"}
            </FormButton>
          </ModalFooter>
        </form>
      </Modal>
    </section>
  );
}

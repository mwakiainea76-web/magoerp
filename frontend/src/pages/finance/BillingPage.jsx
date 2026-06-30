import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Percent, Wallet } from "lucide-react";
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
import { useLookupApi } from "@/hooks/useLookupApi";
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
  { value: "penalty", label: "Penalty" },
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
  const lookupApi = useLookupApi();

  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPayments, setIsLoadingPayments] = useState(true);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [refreshKey, setRefreshKey] = useState(0);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [selectedPaymentStudent, setSelectedPaymentStudent] = useState(null);
  const [selectedAdjustmentInvoice, setSelectedAdjustmentInvoice] = useState(null);

  function fetchStudents(query) {
    return lookupApi
      .search("students", { query, limit: 10 })
      .then((res) => res.data ?? [])
      .catch(() => []);
  }

  function fetchInvoices(query) {
    return invoicesApi
      .list({ q: query, per_page: 6 })
      .then((res) =>
        (res.data ?? []).filter((i) => i.status !== "cancelled").map((i) => ({
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
  }, [invoicesApi, page, perPage, refreshKey]);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingPayments(true);

    paymentsApi
      .list({ per_page: 10 })
      .then((response) => {
        if (isMounted) setPayments(response.data ?? []);
      })
      .catch(() => {
        if (isMounted) setPayments([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPayments(false);
      });

    return () => { isMounted = false; };
  }, [paymentsApi, refreshKey]);

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

  const adjustmentForm = useForm({
    resolver: yupResolver(adjustmentSchema),
    defaultValues: {
      adjustment_invoice_id: "",
      type: "",
      amount: "",
      description: "",
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

  function openPaymentModal() {
    resetPaymentForm();
    setIsPaymentModalOpen(true);
  }

  function openAdjustmentModal() {
    resetAdjustmentForm();
    setIsAdjustmentModalOpen(true);
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
      setPage(1);
      setRefreshKey((value) => value + 1);
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
      setRefreshKey((value) => value + 1);
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
          Review session-generated invoices, record payments, and apply adjustments.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ActionCard
          icon={Wallet}
          title="Record Payment"
          description="Record a student payment. It is allocated automatically to outstanding invoices, oldest first."
          gradientFrom="from-blue-500"
          gradientTo="to-blue-600"
          onClick={openPaymentModal}
        />
        <ActionCard
          icon={Percent}
          title="Adjustments"
          description="Apply discounts, waivers, bursaries, HELB credits, or penalties to an invoice."
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
                  <Th>Adjustments</Th>
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
                      colSpan={9}
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
                      <Td>{formatCurrency(inv.adjustment_amount)}</Td>
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

      <Table>
        <TableHeader>
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">Recent Payments</h2>
        </TableHeader>

        {isLoadingPayments ? (
          <div className={`px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>Loading payments...</div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th>Student</Th><Th>Date</Th><Th>Method</Th><Th>Reference</Th><Th>Amount</Th><Th>Allocated</Th><Th>Available Credit</Th><Th>Status</Th>
              </tr>
            </Thead>
            <Tbody>
              {payments.length === 0 ? (
                <tr><Td colSpan={8} className="py-10 text-center text-slate-500">No payments recorded yet.</Td></tr>
              ) : payments.map((payment) => (
                <tr key={payment.id}>
                  <Td><div className="flex flex-col"><span className="font-medium text-slate-900">{payment.student_name}</span><span className="text-xs text-slate-400">{payment.admission_number}</span></div></Td>
                  <Td>{payment.payment_date ?? '-'}</Td><Td>{payment.method ?? '-'}</Td><Td>{payment.reference ?? '-'}</Td>
                  <Td className="font-semibold">{formatCurrency(payment.amount)}</Td><Td>{formatCurrency(payment.allocated_total)}</Td><Td className="text-sky-700">{formatCurrency(payment.unallocated_amount)}</Td><Td><StatusBadge status={payment.status} /></Td>
                </tr>
              ))}
            </Tbody>
          </TableWrapper>
        )}
      </Table>

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

      {/* Fee Waiver Modal */}
      <Modal
        open={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title="Fee Adjustment"
        description="Apply a credit adjustment or penalty to an invoice."
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
              onChange={(id, option) => {
                adjustmentForm.setValue("adjustment_invoice_id", id, { shouldValidate: true });
                setSelectedAdjustmentInvoice(option ?? null);
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

import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Banknote, TrendingUp, CreditCard, Receipt, Printer, Plus, History, RotateCcw } from "lucide-react";
import { useStudentAccountApi } from "@/hooks/useStudentAccountApi";
import { useInvoicesApi } from "@/hooks/useInvoicesApi";
import { usePaymentsApi } from "@/hooks/usePaymentsApi";
import { toast } from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api/authClient";
import { IssueInvoiceModal } from "@/components/finance/IssueInvoiceModal";
import { RecordPaymentModal } from "@/components/finance/RecordPaymentModal";
import { ReversePaymentModal } from "@/components/finance/ReversePaymentModal";

const money = (value) =>
  `KES ${Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent.bg} ${accent.text}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-[12px] font-medium text-slate-500">{label}</span>
      </div>
      <span className={`text-[18px] font-semibold tracking-tight ${accent.text || "text-slate-900"}`}>{value}</span>
    </div>
  );
}

export function StudentAccountDetailPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const api = useStudentAccountApi();
  const invoicesApi = useInvoicesApi();
  const paymentsApi = usePaymentsApi();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showIssueInvoice, setShowIssueInvoice] = useState(false);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [showReversePayment, setShowReversePayment] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.overview(studentId);
      setData(res.data);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load account."));
    } finally {
      setLoading(false);
    }
  }, [studentId, api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  function typeLabel(type) {
    const labels = { invoice: "Invoice", payment: "Payment", adjustment: "Adjustment", refund: "Refund" };
    return labels[type] || type;
  }

  function typeColor(type) {
    const colors = { invoice: "text-blue-600 bg-blue-50", payment: "text-emerald-600 bg-emerald-50", adjustment: "text-amber-600 bg-amber-50", refund: "text-red-600 bg-red-50" };
    return colors[type] || "text-slate-600 bg-slate-50";
  }

  if (loading) {
    return (
      <section className="space-y-6">
        <div className="h-6 w-48 animate-pulse rounded bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />)}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center text-red-600">{error}</div>
      </section>
    );
  }

  if (!data) return null;

  const { student, overall_balance, session_balance, credit_balance, recent_transactions, invoices, payments } = data;

  const hasCompletedPayments = payments?.some(p => p.status === "completed");

  function handleSuccess(msg) {
    toast.success(msg);
    fetchData();
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate("/admin/finance/student-accounts")}
            className="rounded-lg border border-slate-300 p-2 text-slate-500 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">{student.name}</h1>
            <p className="text-[13px] text-slate-500">{student.admission_number} &mdash; {student.course || "No course"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate(`/admin/finance/statement/${student.id}`)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
            <Printer className="h-3.5 w-3.5" /> Statement
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <button type="button" onClick={() => setShowIssueInvoice(true)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-[13px] font-medium text-white hover:bg-emerald-700">
          <Plus className="h-3.5 w-3.5" /> Issue Invoice
        </button>
        <button type="button" onClick={() => setShowRecordPayment(true)}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-[13px] font-medium text-white hover:bg-blue-700">
          <Banknote className="h-3.5 w-3.5" /> Record Payment
        </button>
        <button type="button" onClick={() => setShowReversePayment(true)}
          disabled={!hasCompletedPayments}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 px-4 text-[13px] font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">
          <RotateCcw className="h-3.5 w-3.5" /> Reverse Payment
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard icon={TrendingUp} label="Outstanding Balance"
          value={money(overall_balance > 0 ? overall_balance : 0)}
          accent={{ bg: "bg-amber-50", text: "text-amber-600" }} />
        <StatCard icon={Receipt} label="Current Session"
          value={money(session_balance)}
          accent={{ bg: "bg-blue-50", text: "text-blue-600" }} />
        <StatCard icon={CreditCard} label="Credit Balance"
          value={money(credit_balance)}
          accent={{ bg: "bg-emerald-50", text: "text-emerald-600" }} />
        <StatCard icon={History} label="Transactions"
          value={recent_transactions?.length || 0}
          accent={{ bg: "bg-purple-50", text: "text-purple-600" }} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="text-[15px] font-semibold text-slate-900">Recent Transactions</h2>
          </div>
          {(!recent_transactions || recent_transactions.length === 0) ? (
            <div className="px-5 py-8 text-center text-[13px] text-slate-500">No transactions found.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recent_transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${typeColor(tx.type)}`}>
                      {typeLabel(tx.type)}
                    </span>
                    <div>
                      <p className="text-[13px] text-slate-700">{tx.description || tx.reference || "—"}</p>
                      <p className="text-[11px] text-slate-400">{tx.transaction_date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {tx.debit > 0 && <p className="text-[13px] font-medium text-red-600">+{money(tx.debit)}</p>}
                    {tx.credit > 0 && <p className="text-[13px] font-medium text-emerald-600">-{money(tx.credit)}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="text-[15px] font-semibold text-slate-900">Outstanding Invoices</h2>
          </div>
          {(!invoices || invoices.length === 0) ? (
            <div className="px-5 py-8 text-center text-[13px] text-slate-500">No outstanding invoices.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {invoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-[13px] font-medium text-slate-900">{inv.invoice_number}</p>
                    <p className="text-[11px] text-slate-400">Due: {inv.due_date} &middot; {inv.items_count} item(s)</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-slate-900">{money(inv.amount_due)}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      inv.status === "issued" ? "bg-amber-100 text-amber-700" :
                      inv.status === "partial" ? "bg-blue-100 text-blue-700" :
                      "bg-emerald-100 text-emerald-700"
                    }`}>{inv.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <h2 className="text-[15px] font-semibold text-slate-900">Recent Payments</h2>
          </div>
          {(!payments || payments.length === 0) ? (
            <div className="px-5 py-8 text-center text-[13px] text-slate-500">No payments recorded.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-[13px] font-medium text-slate-900">{money(p.amount)}</p>
                    <p className="text-[11px] text-slate-400">{p.method}{p.reference ? ` \u00B7 ${p.reference}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-slate-400">{p.payment_date}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      p.status === "completed" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                    }`}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        </div>
      </div>

      <IssueInvoiceModal
        open={showIssueInvoice}
        onClose={() => setShowIssueInvoice(false)}
        studentId={studentId}
        invoicesApi={invoicesApi}
        onSuccess={handleSuccess}
      />

      <RecordPaymentModal
        open={showRecordPayment}
        onClose={() => setShowRecordPayment(false)}
        studentId={studentId}
        paymentsApi={paymentsApi}
        overallBalance={overall_balance > 0 ? overall_balance : 0}
        onSuccess={handleSuccess}
      />

      <ReversePaymentModal
        open={showReversePayment}
        onClose={() => setShowReversePayment(false)}
        payment={hasCompletedPayments ? payments.find(p => p.status === "completed") : null}
        paymentsApi={paymentsApi}
        onSuccess={handleSuccess}
      />
    </section>
  );
}

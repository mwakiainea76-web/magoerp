import { useCallback, useEffect, useId, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Modal, ModalBody, ModalFooter } from "@/components/Modal";
import { getApiErrorMessage } from "@/lib/api/authClient";

const money = (v) =>
  `KES ${Number(v || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function IssueInvoiceModal({ open, onClose, studentId, invoicesApi, onSuccess }) {
  const uid = useId();
  const submitRef = useRef(null);
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

  useEffect(() => {
    if (!open || !studentId) return;
    setError("");
    setFieldErrors({});
    setInvoiceType("fee");
    setSelectedTemplateId("");
    setTemplateItems([]);
    setPenaltyDesc("");
    setPenaltyAmount("");
    const d = new Date(); d.setDate(d.getDate() + 30);
    setDueDate(d.toISOString().split("T")[0]);
    invoicesApi.availableTemplates(studentId).then(res => {
      setTemplates(res.data ?? []);
    }).catch(() => {});
  }, [open, studentId, invoicesApi]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => submitRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open]);

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
          student_id: studentId,
          fee_template_id: selectedTemplateId,
          idempotency_key: `issue:${studentId}:${uid}`,
        });
        onSuccess?.(`Invoice issued from template "${tpl?.template_name || ""}"`);
      } else {
        await invoicesApi.createCharge({
          student_id: studentId,
          charge_type: "penalty",
          amount: parseFloat(penaltyAmount),
          description: penaltyDesc.trim(),
        });
        onSuccess?.("Penalty invoice issued.");
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
    <Modal open={open} onClose={onClose} title="Issue Invoice" size="lg">
      <ModalBody className="space-y-5">
        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}

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
      </ModalBody>

      <ModalFooter>
        <div className="flex w-full items-center justify-between">
          <div className="text-[15px] font-semibold text-slate-900">
            Total: <span className="text-emerald-700">{money(totalAmount)}</span>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
              Cancel
            </button>
            <button type="button" ref={submitRef} onClick={handleSubmit} disabled={submitting || (invoiceType === "fee" && noTemplates)}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {submitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
              Issue Invoice — {money(totalAmount)}
            </button>
          </div>
        </div>
      </ModalFooter>
    </Modal>
  );
}

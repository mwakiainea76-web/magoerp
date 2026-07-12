import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { ChevronLeft, ChevronRight, Save, Send } from "lucide-react";
import { useParams } from "react-router";
import * as yup from "yup";
import { useFeeStructureApi } from "@/hooks/useFeeStructureApi";
import { getApiErrorMessage } from "@/lib/api/authClient";
import { GeneralInformationStep } from "./steps/GeneralInformationStep";
import { FeeItemsStep } from "./steps/FeeItemsStep";

const STEPS = ["General Information", "Fee Items"];

const schema = yup.object({
  name: yup.string().trim().required("Fee structure name is required"),
  code: yup.string().trim().required("Code is required"),
  description: yup.string().trim().nullable(),
  items: yup.array().of(yup.object({
    name: yup.string().trim().required("Item name is required"),
    amount: yup.number().typeError("Enter a valid amount").moreThan(0, "Amount must be greater than 0").required("Amount is required"),
    description: yup.string().trim().nullable(),
  })).min(1, "Add at least one fee item").required(),
});

const defaultValues = {
  name: "",
  code: "",
  description: "",
  items: [{ name: "", amount: "", description: "" }],
};

const stepFields = [["name", "code", "description"], ["items"]];

export function FeeStructureWizardPage() {
  const { templateId } = useParams();
  const api = useFeeStructureApi();
  const form = useForm({ defaultValues, resolver: yupResolver(schema), mode: "onTouched" });
  const [step, setStep] = useState(0);
  const [loadingTemplate, setLoadingTemplate] = useState(Boolean(templateId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!templateId) return;
    setLoadingTemplate(true);
    api
      .show(templateId)
      .then(({ data: tpl }) =>
        form.reset({
          name: tpl.name || "",
          code: tpl.code || "",
          description: tpl.description || "",
          items: tpl.items?.length
            ? tpl.items.map((i) => ({ name: i.name || "", amount: i.amount?.toString() || "", description: i.description || "" }))
            : defaultValues.items,
        }),
      )
      .catch((e) => setError(getApiErrorMessage(e, "Failed to load fee structure.")))
      .finally(() => setLoadingTemplate(false));
  }, [api, form, templateId]);

  async function moveTo(target) {
    if (target > step && !(await form.trigger(stepFields[step], { shouldFocus: true }))) return;
    setError("");
    setStep(target);
  }

  async function save(action) {
    if (!(await form.trigger())) { setError("Please correct the highlighted fields."); return; }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const values = form.getValues();
      const response = await api.create({
        name: values.name,
        code: values.code,
        description: values.description || null,
        items: values.items.map((i) => ({ name: i.name, amount: Number(i.amount), description: i.description || null })),
        action,
      });
      setSuccess(response.message || "Fee structure saved successfully.");
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to save fee structure."));
    } finally {
      setSaving(false);
    }
  }

  if (loadingTemplate) {
    return (
      <section className="space-y-6">
        <div><h1 className="text-[20px] font-semibold text-slate-950">{templateId ? "Edit" : "Create"} Fee Structure</h1></div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-[13px] text-slate-500">Loading fee structure...</span>
        </div>
      </section>
    );
  }

  const view = step === 0 ? <GeneralInformationStep /> : <FeeItemsStep />;

  return (
    <FormProvider {...form}>
      <section className="space-y-6">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">
            {templateId ? "Edit Fee Structure" : "Create Fee Structure"}
          </h1>
          <p className="mt-1 text-[14px] text-slate-500">Set up the fee structure name, code, and items.</p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          {STEPS.map((label, i) => (
            <button key={label} type="button" onClick={() => moveTo(i)} className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-medium ${i === step ? "bg-emerald-600 text-white" : i < step ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                {i < step ? "\u2713" : i + 1}
              </span>
              <span className={`text-[13px] ${i === step ? "font-semibold text-slate-900" : "text-slate-500"}`}>{label}</span>
              {i < STEPS.length - 1 && <span className="mx-2 h-px w-8 bg-slate-200" />}
            </button>
          ))}
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>}
        {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">{success}</div>}

        {view}

        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div>
            {step > 0 && (
              <button type="button" onClick={() => moveTo(step - 1)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            )}
          </div>
          <div className="flex gap-3">
            {step === 1 ? (
              <>
                <button type="button" onClick={() => save("draft")} disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Draft"}
                </button>
                <button type="button" onClick={() => save("publish")} disabled={saving}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                  <Send className="h-4 w-4" /> {saving ? "Publishing..." : "Publish"}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => moveTo(step + 1)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white">
                Continue <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>
    </FormProvider>
  );
}

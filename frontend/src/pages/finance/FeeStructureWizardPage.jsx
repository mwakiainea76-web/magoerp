import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ChevronLeft, ChevronRight, Save, Send, Plus, Trash2, Eye } from "lucide-react";
import { SearchSelect } from "@/components/SearchSelect";
import { FormInput } from "@/components/FormInput";
import { useFeeStructureApi } from "@/hooks/useFeeStructureApi";
import { authClient, getApiErrorMessage } from "@/lib/api/authClient";
import { selectClassName, textAreaClassName, labelClassName } from "@/lib/styles";

const STEPS = ["General Information", "Fee Items", "Assignment", "Review"];

export function FeeStructureWizardPage() {
  const navigate = useNavigate();
  const { templateId } = useParams();
  const api = useFeeStructureApi();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [erroredSteps, setErroredSteps] = useState(new Set());
  const [fieldErrors, setFieldErrors] = useState({});
  const [itemErrors, setItemErrors] = useState([{}]);
  const [lookups, setLookups] = useState({ sessions: [], curricula: [], departments: [] });

  // Form state
  const [form, setForm] = useState({
    name: "",
    code: "",
    description: "",
    // Step 3: Assignment
    academic_session_id: "",
    assignment_scope: "course",
    course_curriculum_id: "",
    department_id: "",
    year_level: "",
    issuance_type: "per_session",
    session_number: "1",
    split_ratios: [],
    action: "draft",
  });

  const [items, setItems] = useState([{ name: "", amount: "", description: "" }]);

  // Preview data
  const [preview, setPreview] = useState(null);

  const [loadingTemplate, setLoadingTemplate] = useState(!!templateId);

  useEffect(() => {
    async function loadLookups() {
      try {
        const [curriculaRes, deptsRes, sessionsResp] = await Promise.all([
          authClient.get("/course-curricula", { params: { per_page: 100 } }).then(r => r.data).catch(() => ({ data: [] })),
          authClient.get("/departments", { params: { per_page: 100 } }).then(r => r.data).catch(() => ({ data: [] })),
          authClient.get("/academic-sessions", { params: { per_page: 100 } }).then(r => r.data).catch(() => ({ data: [] })),
        ]);
        setLookups({
          sessions: Array.isArray(sessionsResp.data) ? sessionsResp.data.map(s => ({ id: s.id, label: s.name })) : [],
          curricula: Array.isArray(curriculaRes.data) ? curriculaRes.data.map(c => ({ id: c.id, label: `${c.course_name || c.course?.name || ''} - ${c.curriculum_name || c.curriculum?.name || ''}` })) : [],
          departments: Array.isArray(deptsRes.data) ? deptsRes.data.map(d => ({ id: d.id, label: d.name })) : [],
        });
      } catch {
        // Silently fail on lookups
      }
    }
    loadLookups();
  }, [api]);

  // Load existing template data when editing
  useEffect(() => {
    if (!templateId) return;

    async function loadTemplate() {
      setLoadingTemplate(true);
      try {
        const res = await api.show(templateId);
        const tpl = res.data;

        setForm(prev => ({
          ...prev,
          name: tpl.name || "",
          code: tpl.code || "",
          description: tpl.description || "",
          academic_session_id: tpl.assignment?.academic_session_id || "",
          assignment_scope: tpl.assignment?.course_curriculum_id ? "course" : tpl.assignment?.department_id ? "department" : "all",
          course_curriculum_id: tpl.assignment?.course_curriculum_id || "",
          department_id: tpl.assignment?.department_id || "",
          year_level: tpl.assignment?.year_level?.toString() || "",
          issuance_type: tpl.assignment?.issuance_type || "per_session",
          session_number: tpl.assignment?.session_number?.toString() || "1",
        }));

        if (tpl.items?.length > 0) {
          setItems(tpl.items.map(i => ({
            name: i.name || "",
            amount: i.amount?.toString() || "",
            description: i.description || "",
          })));
        }
      } catch (e) {
        setError(getApiErrorMessage(e, "Failed to load fee structure."));
      } finally {
        setLoadingTemplate(false);
      }
    }
    loadTemplate();
  }, [templateId, api]);

  const totalAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

  function validateStep(stepIndex) {
    const errors = {};
    if (stepIndex === 0) {
      if (!form.name.trim()) errors.name = "Fee structure name is required";
      if (!form.code.trim()) errors.code = "Code is required";
    }
    if (stepIndex === 1) {
      const itemErrs = items.map(item => {
        const e = {};
        if (!item.name.trim()) e.name = "Required";
        if (!item.amount || parseFloat(item.amount) <= 0) e.amount = "Must be > 0";
        return e;
      });
      setItemErrors(itemErrs);
      return itemErrs.every(e => Object.keys(e).length === 0);
    }
    if (stepIndex === 2) {
      if (!form.academic_session_id) errors.academic_session_id = "Required";
      if (form.assignment_scope === "course" && !form.course_curriculum_id) errors.course_curriculum_id = "Required";
      if (form.assignment_scope === "department" && !form.department_id) errors.department_id = "Required";
      if (form.year_level === "" && form.year_level !== 0) errors.year_level = "Required";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function updateForm(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
    if (key === "name" || key === "code" || key === "description") {
      setErroredSteps(prev => { const n = new Set(prev); n.delete(0); return n; });
    }
    if (key === "academic_session_id" || key === "assignment_scope" || key === "course_curriculum_id" || key === "department_id" || key === "year_level" || key === "issuance_type" || key === "session_number") {
      setErroredSteps(prev => { const n = new Set(prev); n.delete(2); return n; });
    }
    setFieldErrors(prev => ({ ...prev, [key]: undefined }));
  }

  function addItem() {
    setItems(prev => [...prev, { name: "", amount: "", description: "" }]);
    setItemErrors(prev => [...prev, {}]);
    setErroredSteps(prev => { const n = new Set(prev); n.delete(1); return n; });
  }

  function removeItem(index) {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
    setItemErrors(prev => prev.filter((_, i) => i !== index));
    setErroredSteps(prev => { const n = new Set(prev); n.delete(1); return n; });
  }

  function updateItem(index, key, value) {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, [key]: value } : item));
    setItemErrors(prev => prev.map((e, i) => i === index ? { ...e, [key]: undefined } : e));
    setErroredSteps(prev => { const n = new Set(prev); n.delete(1); return n; });
  }

  const canProceed = useCallback(() => {
    if (step === 0) {
      return form.name && form.code;
    }
    if (step === 1) {
      return items.every(i => i.name && parseFloat(i.amount) > 0);
    }
    if (step === 2) {
      if (!form.academic_session_id) return false;
      if (form.assignment_scope === "course" && !form.course_curriculum_id) return false;
      if (form.assignment_scope === "department" && !form.department_id) return false;
      if (!form.year_level && form.year_level !== 0) return false;
      return form.issuance_type;
    }
    return true;
  }, [step, form, items]);

  async function handlePreview() {
    setLoading(true);
    setError("");
    try {
      const res = await api.preview({
        academic_session_id: form.academic_session_id,
        issuance_type: form.issuance_type,
        items: items.map(i => ({ amount: i.amount, name: i.name })),
      });
      setPreview(res.data);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to generate preview."));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(action) {
    setSaving(true);
    setError("");
    setSuccess("");
    setErroredSteps(new Set());

    try {
      const payload = {
        name: form.name,
        code: form.code,
        description: form.description || null,
        academic_session_id: form.academic_session_id,
        assignment_scope: form.assignment_scope,
        course_curriculum_id: form.assignment_scope === "course" ? form.course_curriculum_id : null,
        department_id: form.assignment_scope === "department" ? form.department_id : null,
        year_level: form.year_level === "" || form.year_level === "0" ? 0 : parseInt(form.year_level),
        issuance_type: form.issuance_type,
        session_number: form.issuance_type === "per_session" ? parseInt(form.session_number) : undefined,
        items: items.map(i => ({ name: i.name, amount: parseFloat(i.amount), description: i.description || null })),
        action,
      };
      const res = await api.create(payload);
      setSuccess(res.message || "Fee structure saved successfully.");
    } catch (e) {
      setErroredSteps(prev => { const n = new Set(prev); n.add(0); n.add(1); n.add(2); return n; });
      setError(getApiErrorMessage(e, "Failed to save fee structure."));
    } finally {
      setSaving(false);
    }
  }

  function goToStep(i) {
    if (i > step) {
      if (!validateStep(step)) return;
    }
    setStep(i);
    setError("");
    setFieldErrors({});
  }

  function nextStep() {
    if (step === 2) {
      handlePreview();
    }
    setStep(prev => Math.min(prev + 1, 3));
  }

  function prevStep() {
    setStep(prev => Math.max(prev - 1, 0));
  }

  const scopeLabel = {
    course: form.course_curriculum_id
      ? lookups.curricula.find(c => c.id === form.course_curriculum_id)?.label || "Selected Course"
      : "—",
    department: form.department_id
      ? lookups.departments.find(d => d.id === form.department_id)?.label || "Selected Department"
      : "—",
    all: "All Courses",
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">
          {templateId ? "Edit Fee Structure" : "Create Fee Structure"}
        </h1>
        <p className="mt-1 text-[14px] text-slate-500">Set up fees.</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        {STEPS.map((label, i) => {
          const isErrored = erroredSteps.has(i);
          return (
            <button key={i} type="button" onClick={() => goToStep(i)}
              className="flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={i > step && !canProceed()}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-medium transition ${
                isErrored ? "bg-red-500 text-white ring-2 ring-red-300" :
                i === step ? "bg-emerald-600 text-white" : i < step ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
              }`}>
                {i < step && !isErrored ? "✓" : i + 1}
              </div>
              <span className={`text-[13px] ${isErrored ? "font-semibold text-red-600" : i === step ? "font-semibold text-slate-900" : "text-slate-500"}`}>{label}</span>
              {i < STEPS.length - 1 && <div className="mx-2 h-px w-8 bg-slate-200" />}
            </button>
          );
        })}
      </div>

      {loadingTemplate && (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-[13px] text-slate-500">Loading fee structure...</span>
        </div>
      )}

      {templateId && !loadingTemplate && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
          Editing will create a new version. The original fee structure remains unchanged.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
          {error}
          {erroredSteps.size > 0 && (
            <p className="mt-1 text-[12px] text-red-500">
              Fix the issue in the highlighted step{erroredSteps.size > 1 ? "s" : ""} above, then try again.
            </p>
          )}
        </div>
      )}
      {success && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">{success}</div>}

      {/* Step 1: General Information */}
      {step === 0 && (
        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-[15px] font-semibold text-slate-900">General Information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              id="fee-structure-name"
              label="Fee Structure Name"
              placeholder="e.g. BSc Computer Science Fees"
              required
              value={form.name}
              onChange={e => updateForm("name", e.target.value)}
              error={fieldErrors.name}
            />
            <FormInput
              id="fee-structure-code"
              label="Code"
              placeholder="e.g. CSC-FEES-2026"
              required
              value={form.code}
              onChange={e => updateForm("code", e.target.value.toUpperCase())}
              error={fieldErrors.code}
            />
            <div className="md:col-span-2">
              <label htmlFor="fee-structure-description" className={labelClassName}>Description</label>
              <textarea id="fee-structure-description" value={form.description}
                onChange={e => updateForm("description", e.target.value)}
                className={textAreaClassName}
                rows={2} placeholder="Optional description" />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Fee Items */}
      {step === 1 && (
        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-slate-900">Fee Items</h2>
            <button type="button" onClick={addItem}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-emerald-700">
              <Plus className="h-3.5 w-3.5" /> Add Item
            </button>
          </div>
          <div className="space-y-4">
            {items.map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <FormInput
                    label="Item Name"
                    required
                    value={item.name}
                    onChange={e => updateItem(i, "name", e.target.value)}
                    placeholder="e.g. Tuition"
                    error={itemErrors[i]?.name}
                  />
                  <FormInput
                    label="Amount (KES)"
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={item.amount}
                    onChange={e => updateItem(i, "amount", e.target.value)}
                    placeholder="0.00"
                    error={itemErrors[i]?.amount}
                  />
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <FormInput
                        label="Description"
                        value={item.description}
                        onChange={e => updateItem(i, "description", e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                    <button type="button" onClick={() => removeItem(i)} disabled={items.length <= 1}
                      className="mt-7 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span className="text-[13px] font-semibold text-slate-700">Total</span>
              <span className="text-[15px] font-semibold text-emerald-700">KES {totalAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Assignment */}
      {step === 2 && (
        <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-[15px] font-semibold text-slate-900">Assignment Configuration</h2>

          {/* Academic Session */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Academic Session *</label>
            <p className="mb-1 text-[12px] text-slate-400">Select the session this fee structure will be effective for.</p>
            <SearchSelect placeholder="Select academic session" value={form.academic_session_id}
              options={lookups.sessions}
              onChange={v => updateForm("academic_session_id", v)} />
          </div>

          {/* Assignment Scope */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Assign By *</label>
            <p className="mb-1 text-[12px] text-slate-400">Choose how to assign this fee structure.</p>
            <div className="flex gap-3">
              {[
                { value: "course", label: "Course" },
                { value: "department", label: "Department" },
                { value: "all", label: "All Courses" },
              ].map(opt => (
                <label key={opt.value} className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 cursor-pointer hover:border-emerald-400 ${form.assignment_scope === opt.value ? "border-emerald-500 bg-emerald-50" : "border-slate-300"}`}>
                  <input type="radio" name="assignment_scope" value={opt.value}
                    checked={form.assignment_scope === opt.value}
                    onChange={e => updateForm("assignment_scope", e.target.value)} className="accent-emerald-600" />
                  <span className="text-[13px] whitespace-nowrap">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Course selector (when scope = course) */}
          {form.assignment_scope === "course" && (
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-700">Course *</label>
              <SearchSelect placeholder="Select course" value={form.course_curriculum_id}
                options={lookups.curricula}
                onChange={v => updateForm("course_curriculum_id", v)} />
            </div>
          )}

          {/* Department selector (when scope = department) */}
          {form.assignment_scope === "department" && (
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-700">Department *</label>
              <SearchSelect placeholder="Select department" value={form.department_id}
                options={lookups.departments}
                onChange={v => updateForm("department_id", v)} />
            </div>
          )}

          {/* Year Level */}
          <div>
            <label className="mb-1 block text-[13px] font-medium text-slate-700">Year Level *</label>
            <select value={form.year_level} onChange={e => updateForm("year_level", e.target.value)}
              className={selectClassName}>
              <option value="">Select year</option>
              <option value="0">All Years</option>
              {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>

          {/* Issue Type */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Issue *</label>
            <div className="flex gap-4">
              <label className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 cursor-pointer ${form.issuance_type === "per_session" ? "border-emerald-500 bg-emerald-50" : "border-slate-300"} hover:border-emerald-400`}>
                <input type="radio" name="issuance_type" value="per_session" checked={form.issuance_type === "per_session"}
                  onChange={e => updateForm("issuance_type", e.target.value)} className="accent-emerald-600" />
                <span className="text-[13px]">Once per Session</span>
              </label>
              <label className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 cursor-pointer ${form.issuance_type === "per_year" ? "border-emerald-500 bg-emerald-50" : "border-slate-300"} hover:border-emerald-400`}>
                <input type="radio" name="issuance_type" value="per_year" checked={form.issuance_type === "per_year"}
                  onChange={e => updateForm("issuance_type", e.target.value)} className="accent-emerald-600" />
                <span className="text-[13px]">Every Session (Split across year)</span>
              </label>
            </div>
          </div>

          {form.issuance_type === "per_session" && (
            <div>
              <label className="mb-1 block text-[13px] font-medium text-slate-700">Session Number *</label>
              <select value={form.session_number} onChange={e => updateForm("session_number", e.target.value)}
                className={selectClassName}>
                <option value="1">Session 1</option>
                <option value="2">Session 2</option>
                <option value="3">Session 3</option>
              </select>
            </div>
          )}

          {/* Preview Matrix */}
          {preview && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Eye className="h-4 w-4 text-slate-400" />
                <h3 className="text-[13px] font-semibold text-slate-700">Preview Matrix</h3>
              </div>
              <div className="hidden md:grid md:grid-cols-3 gap-3 px-1 pb-2">
                <span className="text-[13px] font-medium text-slate-500">Year</span>
                <span className="text-[13px] font-medium text-slate-500">Session</span>
                <span className="text-[13px] font-medium text-slate-500 text-right">Amount</span>
              </div>
              <div className="space-y-2">
                {preview.generated_assignments?.map((a, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2">
                    <span className="text-[13px] text-slate-700"><span className="md:hidden font-medium text-slate-500">Year: </span>{preview.academic_year || "—"}</span>
                    <span className="text-[13px] text-slate-700"><span className="md:hidden font-medium text-slate-500">Session: </span>{a.session}</span>
                    <span className="text-[13px] font-medium text-slate-900 md:text-right">
                      <span className="md:hidden font-medium text-slate-500">Amount: </span>KES {a.amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 font-semibold">
                  <span className="text-[13px] text-slate-700 md:col-span-2">Total</span>
                  <span className="text-[13px] text-emerald-700 md:text-right">
                    KES {preview.total_amount?.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Review */}
      {step === 3 && (
        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-[15px] font-semibold text-slate-900">Review & Confirm</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="mb-2 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Fee Structure</h3>
              <p className="text-[15px] font-semibold text-slate-900">{form.name || "—"}</p>
              <p className="text-[12px] text-slate-400">Code: {form.code || "—"}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="mb-2 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Total Amount</h3>
              <p className="text-[15px] font-semibold text-emerald-700">
                KES {totalAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[12px] text-slate-400">{items.length} item(s)</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="mb-2 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Assignment Summary</h3>
              <p className="text-[13px] text-slate-700">Scope: {form.assignment_scope === "course" ? "Course" : form.assignment_scope === "department" ? "Department" : "All Courses"}</p>
              <p className="text-[12px] text-slate-400">{scopeLabel[form.assignment_scope]} · {form.year_level === "0" || form.year_level === 0 ? "All Years" : `Year ${form.year_level}`}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="mb-2 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Issue</h3>
              <p className="text-[13px] text-slate-700">
                {form.issuance_type === "per_session" ? "Once per Session" : "Split across all sessions"}
              </p>
            </div>
          </div>
          {preview?.generated_assignments && (
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="mb-2 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Generated Assignments</h3>
              <div className="space-y-1">
                {preview.generated_assignments.map((a, i) => (
                  <div key={i} className="flex justify-between text-[13px]">
                    <span className="text-slate-600">{a.session}</span>
                    <span className="font-medium text-slate-900">KES {a.amount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div>
          {step > 0 && (
            <button type="button" onClick={prevStep}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {step === 3 && (
            <>
              <button type="button" onClick={() => handleSave("draft")} disabled={saving}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Draft"}
              </button>
              <button type="button" onClick={() => handleSave("publish")} disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                <Send className="h-4 w-4" /> {saving ? "Publishing..." : "Publish"}
              </button>
            </>
          )}
          {step < 3 && (
            <button type="button" onClick={nextStep} disabled={!canProceed() || loading || loadingTemplate}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              {loading ? "Loading..." : step === 2 ? "Preview & Continue" : "Continue"}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
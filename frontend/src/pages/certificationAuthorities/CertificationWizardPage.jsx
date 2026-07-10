import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, Send } from "lucide-react";
import { FormInput } from "@/components/FormInput";
import { authClient, getApiErrorMessage } from "@/lib/api/authClient";
import { textAreaClassName, labelClassName } from "@/lib/styles";

function CertificationWizardPage() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [erroredSteps, setErroredSteps] = useState(new Set());
  const [fieldErrors, setFieldErrors] = useState({});
  const [levelErrors, setLevelErrors] = useState([{}]);
  const [gradeErrors, setGradeErrors] = useState([{}]);

  const [authority, setAuthority] = useState({
    code: "",
    name: "",
    description: "",
    is_active: true,
  });

  const [levels, setLevels] = useState([
    { code: "", name: "", entry_grade: "", description: "", is_active: true },
  ]);

  const [grades, setGrades] = useState([
    { grade: "", grade_start: "", grade_end: "", remark: "", is_active: true },
  ]);

  function validateStep(stepIndex) {
    const errors = {};
    if (stepIndex === 0) {
      if (!authority.code.trim()) errors.code = "Authority code is required";
      if (!authority.name.trim()) errors.name = "Authority name is required";
    }
    if (stepIndex === 1) {
      const itemErrors = levels.map(l => {
        const e = {};
        if (!l.code.trim()) e.code = "Required";
        if (!l.name.trim()) e.name = "Required";
        return e;
      });
      setLevelErrors(itemErrors);
      return itemErrors.every(e => Object.keys(e).length === 0);
    }
    if (stepIndex === 2) {
      const itemErrors = grades.map(g => {
        const e = {};
        if (!g.grade.trim()) e.grade = "Required";
        if (g.grade_start === "" || g.grade_start === null) e.grade_start = "Required";
        if (g.grade_end === "" || g.grade_end === null) e.grade_end = "Required";
        return e;
      });
      setGradeErrors(itemErrors);
      return itemErrors.every(e => Object.keys(e).length === 0);
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function updateAuthority(key, value) {
    setAuthority(prev => ({ ...prev, [key]: value }));
    setErroredSteps(prev => { const n = new Set(prev); n.delete(0); return n; });
    setFieldErrors(prev => ({ ...prev, [key]: undefined }));
  }

  function addLevel() {
    setLevels(prev => [...prev, { code: "", name: "", entry_grade: "", description: "", is_active: true }]);
    setLevelErrors(prev => [...prev, {}]);
  }

  function removeLevel(index) {
    if (levels.length <= 1) return;
    setLevels(prev => prev.filter((_, i) => i !== index));
    setLevelErrors(prev => prev.filter((_, i) => i !== index));
  }

  function updateLevel(index, key, value) {
    setLevels(prev => prev.map((l, i) => i === index ? { ...l, [key]: value } : l));
    setErroredSteps(prev => { const n = new Set(prev); n.delete(1); return n; });
    setLevelErrors(prev => prev.map((e, i) => i === index ? { ...e, [key]: undefined } : e));
  }

  function addGrade() {
    setGrades(prev => [...prev, { grade: "", grade_start: "", grade_end: "", remark: "", is_active: true }]);
    setGradeErrors(prev => [...prev, {}]);
  }

  function removeGrade(index) {
    if (grades.length <= 1) return;
    setGrades(prev => prev.filter((_, i) => i !== index));
    setGradeErrors(prev => prev.filter((_, i) => i !== index));
  }

  function updateGrade(index, key, value) {
    setGrades(prev => prev.map((g, i) => i === index ? { ...g, [key]: value } : g));
    setErroredSteps(prev => { const n = new Set(prev); n.delete(2); return n; });
    setGradeErrors(prev => prev.map((e, i) => i === index ? { ...e, [key]: undefined } : e));
  }

  const canProceed = () => {
    if (step === 0) return authority.code && authority.name;
    if (step === 1) return levels.every(l => l.code && l.name);
    if (step === 2) return grades.every(g => g.grade && g.grade_start !== "" && g.grade_end !== "");
    return true;
  };

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess("");
    setErroredSteps(new Set());

    try {
      let authId;
      try {
        const authRes = await authClient.post("/certification-authorities", {
          code: authority.code.trim(),
          name: authority.name.trim(),
          description: authority.description.trim() || null,
          is_active: authority.is_active,
        });
        authId = authRes.data.data.id;
      } catch (e) {
        setErroredSteps(prev => { const n = new Set(prev); n.add(0); return n; });
        throw { step: 0, message: getApiErrorMessage(e, "Failed to save certification authority.") };
      }

      try {
        for (const l of levels) {
          if (!l.code) continue;
          await authClient.post("/certification-levels", {
            certification_authority_id: authId,
            code: l.code.trim(),
            name: l.name.trim(),
            entry_grade: l.entry_grade.trim() || null,
            description: l.description.trim() || null,
            is_active: l.is_active,
          });
        }
      } catch (e) {
        setErroredSteps(prev => { const n = new Set(prev); n.add(1); return n; });
        throw { step: 1, message: getApiErrorMessage(e, "Failed to save certification level.") };
      }

      try {
        for (const g of grades) {
          if (!g.grade) continue;
          await authClient.post(`/certification-authorities/${authId}/grades`, {
            grade: g.grade.trim(),
            grade_start: parseFloat(g.grade_start),
            grade_end: parseFloat(g.grade_end),
            remark: g.remark.trim() || null,
            is_active: g.is_active,
          });
        }
      } catch (e) {
        setErroredSteps(prev => { const n = new Set(prev); n.add(2); return n; });
        throw { step: 2, message: getApiErrorMessage(e, "Failed to save grade boundary.") };
      }

      setSuccess(`Certification authority "${authority.code}" created successfully with ${levels.filter(l => l.code).length} level(s) and ${grades.filter(g => g.grade).length} grade(s).`);
    } catch (thrown) {
      if (thrown?.step !== undefined) {
        setError(thrown.message);
      } else {
        setError(getApiErrorMessage(thrown, "Failed to save certification data."));
      }
      setSuccess("");
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

  function resetAll() {
    setStep(0);
    setError("");
    setSuccess("");
    setErroredSteps(new Set());
    setAuthority({ code: "", name: "", description: "", is_active: true });
    setLevels([{ code: "", name: "", entry_grade: "", description: "", is_active: true }]);
    setGrades([{ grade: "", grade_start: "", grade_end: "", remark: "", is_active: true }]);
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">
          Create Certification Setup
        </h1>
        <p className="mt-1 text-[14px] text-slate-500">
          Define a certification authority, its levels, and grade boundaries.
        </p>
      </div>

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
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[13px] text-emerald-700">
          <p>{success}</p>
          <button type="button" onClick={resetAll}
            className="mt-2 text-[13px] font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
            Create another
          </button>
        </div>
      )}

      {step === 0 && !success && (
        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-[15px] font-semibold text-slate-900">Certification Authority</h2>
          <p className="text-[13px] text-slate-500">Define the examining or awarding body.</p>
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              id="auth-code"
              label="Authority Code"
              placeholder="e.g. CDACC"
              required
              value={authority.code}
              onChange={e => updateAuthority("code", e.target.value.toUpperCase())}
              error={fieldErrors.code}
            />
            <FormInput
              id="auth-name"
              label="Authority Name"
              placeholder="e.g. Curriculum Development ..."
              required
              value={authority.name}
              onChange={e => updateAuthority("name", e.target.value)}
              error={fieldErrors.name}
            />
            <div className="md:col-span-2">
              <label htmlFor="auth-description" className={labelClassName}>Description</label>
              <textarea id="auth-description" value={authority.description}
                onChange={e => updateAuthority("description", e.target.value)}
                className={textAreaClassName}
                rows={2} placeholder="Optional description" />
            </div>
            <div>
              <label className="flex items-center gap-2 text-[13px] text-slate-700">
                <input type="checkbox" checked={authority.is_active} onChange={e => updateAuthority("is_active", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-emerald-600" />
                Authority is active
              </label>
            </div>
          </div>
        </div>
      )}

      {step === 1 && !success && (
        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Certification Levels</h2>
              <p className="text-[13px] text-slate-500">Link level codes and names to the certification authority.</p>
            </div>
            <button type="button" onClick={addLevel}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-emerald-700">
              <Plus className="h-3.5 w-3.5" /> Add Level
            </button>
          </div>
          <div className="space-y-4">
            {levels.map((l, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <FormInput
                    label="Level Code"
                    required
                    value={l.code}
                    onChange={e => updateLevel(i, "code", e.target.value.toUpperCase())}
                    placeholder="e.g. L4"
                    error={levelErrors[i]?.code}
                  />
                  <FormInput
                    label="Level Name"
                    required
                    value={l.name}
                    onChange={e => updateLevel(i, "name", e.target.value)}
                    placeholder="e.g. Level 4"
                    error={levelErrors[i]?.name}
                  />
                  <FormInput
                    label="Entry Grade"
                    value={l.entry_grade}
                    onChange={e => updateLevel(i, "entry_grade", e.target.value)}
                    placeholder="e.g. KCSE C-"
                  />
                  <FormInput
                    label="Description"
                    value={l.description}
                    onChange={e => updateLevel(i, "description", e.target.value)}
                    placeholder="Optional"
                  />
                  <div className="flex items-end justify-end md:items-start md:pt-1">
                    <button type="button" onClick={() => removeLevel(i)} disabled={levels.length <= 1}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 2 && !success && (
        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Grade Boundaries</h2>
              <p className="text-[13px] text-slate-500">Define grade ranges and labels for this certification authority.</p>
            </div>
            <button type="button" onClick={addGrade}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-emerald-700">
              <Plus className="h-3.5 w-3.5" /> Add Grade
            </button>
          </div>
          <div className="space-y-4">
            {grades.map((g, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <FormInput
                    label="Grade"
                    required
                    value={g.grade}
                    onChange={e => updateGrade(i, "grade", e.target.value)}
                    placeholder="e.g. A"
                    error={gradeErrors[i]?.grade}
                  />
                  <FormInput
                    label="Score Start"
                    type="number"
                    required
                    min="0"
                    max="100"
                    value={g.grade_start}
                    onChange={e => updateGrade(i, "grade_start", e.target.value)}
                    placeholder="0"
                    error={gradeErrors[i]?.grade_start}
                  />
                  <FormInput
                    label="Score End"
                    type="number"
                    required
                    min="0"
                    max="100"
                    value={g.grade_end}
                    onChange={e => updateGrade(i, "grade_end", e.target.value)}
                    placeholder="100"
                    error={gradeErrors[i]?.grade_end}
                  />
                  <FormInput
                    label="Remark"
                    value={g.remark}
                    onChange={e => updateGrade(i, "remark", e.target.value)}
                    placeholder="e.g. Distinction"
                  />
                  <div className="flex items-end justify-end md:items-start md:pt-1">
                    <button type="button" onClick={() => removeGrade(i)} disabled={grades.length <= 1}
                      className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 3 && !success && (
        <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="text-[15px] font-semibold text-slate-900">Review & Confirm</h2>
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="mb-2 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Certification Authority</h3>
            <p className="text-[15px] font-semibold text-slate-900">{authority.name || "—"}</p>
            <p className="text-[12px] text-slate-400">Code: {authority.code || "—"}</p>
          </div>
          {levels.some(l => l.code) && (
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="mb-2 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Certification Levels ({levels.filter(l => l.code).length})</h3>
              <div className="divide-y divide-slate-100">
                {levels.filter(l => l.code).map((l, i) => (
                  <div key={i} className="flex justify-between py-1.5 text-[13px]">
                    <span className="font-medium text-slate-900">{l.code} — {l.name}</span>
                    <span className="text-slate-500">{l.entry_grade ? `Entry: ${l.entry_grade}` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {grades.some(g => g.grade) && (
            <div className="rounded-xl border border-slate-200 p-4">
              <h3 className="mb-2 text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Grade Boundaries ({grades.filter(g => g.grade).length})</h3>
              <div className="divide-y divide-slate-100">
                {grades.filter(g => g.grade).map((g, i) => (
                  <div key={i} className="flex justify-between py-1.5 text-[13px]">
                    <span className="font-medium text-slate-900">{g.grade}</span>
                    <span className="text-slate-500">{g.grade_start} – {g.grade_end}{g.remark ? ` · ${g.remark}` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!success && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div>
            {step > 0 && (
              <button type="button" onClick={() => goToStep(step - 1)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {step === 3 && (
              <button type="button" onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                <Send className="h-4 w-4" /> {saving ? "Creating..." : "Create"}
              </button>
            )}
            {step < 3 && (
              <button type="button" onClick={() => goToStep(step + 1)} disabled={!canProceed()}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                {step === 2 ? "Review" : "Continue"}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export { CertificationWizardPage };

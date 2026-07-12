import { useEffect, useState } from "react";
import { FormProvider, useForm, useFormContext } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { ArrowLeft, Eye, Send } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import * as yup from "yup";
import { useFeeStructureApi } from "@/hooks/useFeeStructureApi";
import { useCurriculumFeeStructuresApi } from "@/hooks/useCurriculumFeeStructuresApi";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { getApiErrorMessage } from "@/lib/api/authClient";
import { AssignmentStep } from "@/pages/finance/fee-structure/steps/AssignmentStep";
import { ReviewStep } from "@/pages/finance/fee-structure/steps/ReviewStep";

const assignmentSchema = yup.object({
  academic_session_id: yup.string().required("Academic session is required"),
  assignment_scope: yup.string().oneOf(["course", "department", "all"]).required(),
  course_curriculum_id: yup.string().when("assignment_scope", {
    is: "course", then: (s) => s.required("Course is required"), otherwise: (s) => s.nullable(),
  }),
  department_id: yup.string().when("assignment_scope", {
    is: "department", then: (s) => s.required("Department is required"), otherwise: (s) => s.nullable(),
  }),
  year_level: yup.string().required("Year level is required"),
  issuance_type: yup.string().oneOf(["per_session", "per_year"]).required(),
  session_number: yup.string().when("issuance_type", {
    is: "per_session", then: (s) => s.required("Session number is required"), otherwise: (s) => s.nullable(),
  }),
});

const defaultFormValues = {
  academic_session_id: "",
  assignment_scope: "course",
  course_curriculum_id: "",
  department_id: "",
  year_level: "",
  issuance_type: "per_session",
  session_number: "1",
  name: "",
  code: "",
  items: [{ name: "", amount: "", description: "" }],
};

export function CourseFeeAssignPage() {
  const { templateId } = useParams();
  const feeStructureApi = useFeeStructureApi();
  const assignmentsApi = useCurriculumFeeStructuresApi();
  const sessionsApi = useAcademicSessionsApi();
  const lookupApi = useLookupApi();

  const [structure, setStructure] = useState(null);
  const [totalAmount, setTotalAmount] = useState(0);
  const [itemsCount, setItemsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lookups, setLookups] = useState({ sessions: [], curricula: [], departments: [] });
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const form = useForm({
    defaultValues: defaultFormValues,
    resolver: yupResolver(assignmentSchema),
    mode: "onTouched",
  });

  useEffect(() => {
    Promise.all([
      lookupApi.search("course-curricula", { limit: 100 }).then((r) => r.data || []).catch(() => []),
      lookupApi.search("departments", { limit: 100 }).then((r) => r.data || []).catch(() => []),
      sessionsApi.list({ per_page: 100, status: "all", sort_by: "start_date", sort_direction: "asc" }).then((r) => r.data || []).catch(() => []),
    ]).then(([curricula, departments, sessions]) =>
      setLookups({
        sessions: sessions.map((s) => ({ id: s.id, label: s.name })),
        curricula: curricula.map((c) => ({ id: c.id, label: `${c.course_name || c.course?.name || ""} - ${c.curriculum_name || c.curriculum?.name || ""}` })),
        departments: departments.map((d) => ({ id: d.id, label: d.name })),
      })
    );
  }, [lookupApi, sessionsApi]);

  useEffect(() => {
    if (!templateId) return;
    setLoading(true);
    feeStructureApi
      .show(templateId)
      .then(({ data: fs }) => {
        setStructure(fs);
        const items = fs.items || [];
        const total = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
        setTotalAmount(total);
        setItemsCount(items.length);
        form.reset({
          ...defaultFormValues,
          name: fs.name || "",
          code: fs.code || "",
          items: items.length
            ? items.map((i) => ({ name: i.name, amount: i.amount?.toString() || "", description: i.description || "" }))
            : defaultFormValues.items,
        });
      })
      .catch((e) => setError(getApiErrorMessage(e, "Failed to load fee structure.")))
      .finally(() => setLoading(false));
  }, [templateId, feeStructureApi, form]);

  async function generatePreview() {
    if (!(await form.trigger())) return;
    setLoadingPreview(true);
    setError("");
    try {
      const values = form.getValues();
      const res = await feeStructureApi.preview({
        academic_session_id: values.academic_session_id,
        issuance_type: values.issuance_type,
        items: structure?.items?.length
          ? structure.items.map((i) => ({ name: i.name, amount: i.amount }))
          : [{ name: structure?.name || "", amount: totalAmount }],
      });
      setPreview(res.data);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to generate preview."));
    } finally {
      setLoadingPreview(false);
    }
  }

  async function handleSave(action) {
    if (!(await form.trigger())) return;
    setSaving(true);
    setError("");
    try {
      const values = form.getValues();
      await assignmentsApi.create(templateId, {
        assignment_scope: values.assignment_scope,
        issuance_type: values.issuance_type,
        course_curriculum_id: values.assignment_scope === "course" ? values.course_curriculum_id : null,
        department_id: values.assignment_scope === "department" ? values.department_id : null,
        year_level: Number(values.year_level),
        session_number: values.issuance_type === "per_session" ? Number(values.session_number) : null,
        academic_year_id: values.issuance_type === "per_year" ? values.academic_session_id : null,
        split_ratios: null,
        is_approved: action === "publish",
      });
      toast.success(action === "publish" ? "Fee structure published successfully." : "Fee assignment saved as draft.");
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to save fee assignment."));
    } finally {
      setSaving(false);
    }
  }

function AssignmentFormContent({ lookups, preview, loadingPreview, saving, error, onGeneratePreview, onSave }) {
  const { watch } = useFormContext();
  const v = watch();

  const canPreview = Boolean(
    v.academic_session_id &&
    v.year_level !== "" &&
    (v.assignment_scope !== "course" || v.course_curriculum_id) &&
    (v.assignment_scope !== "department" || v.department_id) &&
    (v.issuance_type !== "per_session" || v.session_number)
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</div>
      )}

      <AssignmentStep lookups={lookups} />

      <div className="flex justify-center">
        <button type="button" onClick={onGeneratePreview} disabled={!canPreview || loadingPreview}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          <Eye className="h-4 w-4" /> {loadingPreview ? "Generating..." : "Generate Preview"}
        </button>
      </div>

      {preview && <ReviewStep lookups={lookups} preview={preview} />}

      <div className="flex items-center justify-end gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <button type="button" onClick={() => onSave("draft")} disabled={saving}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          Save Draft
        </button>
        <button type="button" onClick={() => onSave("publish")} disabled={saving || !preview}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          <Send className="h-4 w-4" /> {saving ? "Publishing..." : "Publish"}
        </button>
      </div>
    </div>
  );
}

  if (loading) {
    return (
      <section className="space-y-6">
        <div><h1 className="text-[20px] font-semibold text-slate-950">Assign Fee Structure</h1></div>
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-[13px] text-slate-500">Loading fee structure...</span>
        </div>
      </section>
    );
  }

  if (!structure) {
    return (
      <section className="space-y-6">
        <div><h1 className="text-[20px] font-semibold text-slate-950">Assign Fee Structure</h1></div>
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error || "Fee structure not found."}</div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/finance/course-fee"
          className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">Assign Fee Structure</h1>
          <p className="mt-1 text-[14px] text-slate-500">Configure assignment for <strong>{structure.name}</strong>.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-200/80 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700">
            <span className="text-[15px] font-bold">{structure.code?.slice(0, 3)}</span>
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-slate-900">{structure.name}</h2>
            <p className="text-[12px] text-slate-500">
              {structure.code} &middot; KES {totalAmount.toLocaleString("en-KE", { minimumFractionDigits: 2 })}
              &middot; {itemsCount} item{itemsCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <FormProvider {...form}>
        <AssignmentFormContent
          lookups={lookups}
          preview={preview}
          loadingPreview={loadingPreview}
          saving={saving}
          error={error}
          onGeneratePreview={generatePreview}
          onSave={handleSave}
        />
      </FormProvider>
    </section>
  );
}

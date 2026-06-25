import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Printer } from "lucide-react";

import { bodyTextClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useStudentsApi } from "@/hooks/useStudentsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function AdmissionLetterPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const api = useStudentsApi();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true); setError("");
      try {
        const res = await api.admissionLetter(studentId);
        if (mounted) setData(res.data ?? null);
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load."));
      } finally { if (mounted) setIsLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, [studentId]);

  function handlePrint() { window.print(); }

  if (isLoading) {
    return <div className={`p-5 text-slate-500 ${bodyTextClassName}`}>Loading...</div>;
  }
  if (error) {
    return <div className={`m-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>;
  }
  if (!data) {
    return <div className={`m-5 text-slate-500 ${bodyTextClassName}`}>No data found.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="mx-auto max-w-4xl p-5 print:p-0">
        <div className="no-print mb-4 flex items-center justify-between">
          <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <FormButton onClick={handlePrint}>
            <Printer className="mr-1.5 h-4 w-4" /> Print Letter
          </FormButton>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:rounded-none print:border-none print:shadow-none">
          <div className="mb-8 border-b border-slate-200 pb-6 text-center">
            <h1 className="text-[22px] font-bold text-slate-900">{data.institution_name}</h1>
            <p className="mt-1 text-[13px] text-slate-500">ADMISSION LETTER</p>
          </div>

          <div className="mb-6 flex items-start justify-between text-[13px]">
            <div>
              <p><span className="font-medium text-slate-500">Ref:</span> <span className="text-slate-800">{data.reference_number}</span></p>
              <p><span className="font-medium text-slate-500">Date:</span> <span className="text-slate-800">{data.date}</span></p>
            </div>
            {data.enrolment_status ? (
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-semibold capitalize text-emerald-700">
                {data.enrolment_status}
              </span>
            ) : null}
          </div>

          <div className="mb-6">
            <p className="text-[14px] leading-6 text-slate-700">
              Dear <span className="font-semibold text-slate-900">{data.student_name}</span>,
            </p>
            <p className="mt-3 text-[14px] leading-6 text-slate-700">
              We are pleased to inform you that you have been admitted to <strong>{data.institution_name}</strong> for the academic program detailed below.
            </p>
          </div>

          <div className="mb-6 grid gap-4 rounded-lg border border-slate-100 bg-slate-50 p-5 text-[13px] sm:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-800">Student Details</h3>
              <div className="space-y-1 text-slate-600">
                <p><span className="font-medium text-slate-500">Full Name:</span> {data.student_name}</p>
                <p><span className="font-medium text-slate-500">Admission #:</span> {data.admission_number}</p>
                <p><span className="font-medium text-slate-500">Email:</span> {data.email ?? "—"}</p>
                <p><span className="font-medium text-slate-500">Phone:</span> {data.phone ?? "—"}</p>
                <p><span className="font-medium text-slate-500">Gender:</span> {data.gender ?? "—"}</p>
                <p><span className="font-medium text-slate-500">Admission Date:</span> {data.admission_date}</p>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-800">Program Details</h3>
              <div className="space-y-1 text-slate-600">
                <p><span className="font-medium text-slate-500">Course:</span> {data.course_name}</p>
                <p><span className="font-medium text-slate-500">Code:</span> {data.course_code}</p>
                <p><span className="font-medium text-slate-500">Duration:</span> {data.duration ?? "—"}</p>
                <p><span className="font-medium text-slate-500">Department:</span> {data.department_name ?? "—"}</p>
                <p><span className="font-medium text-slate-500">Certification:</span> {data.certification_level ?? "—"} ({data.certification_authority ?? "—"})</p>
                <p><span className="font-medium text-slate-500">Curriculum:</span> {data.curriculum_name ?? "—"}</p>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-lg border border-sky-100 bg-sky-50 p-4 text-[13px]">
            <h3 className="mb-2 font-semibold text-sky-800">Student Portal Access</h3>
            <p className="text-sky-700">
              You can access the student portal at: <strong>{data.portal_url}</strong>
            </p>
            {data.login_id ? (
              <p className="mt-1 text-sky-700">Your login ID is: <strong>{data.login_id}</strong></p>
            ) : null}
            <p className="mt-2 text-[12px] text-sky-600">Please keep your login credentials secure. Do not share your password with anyone.</p>
          </div>

          <div className="border-t border-slate-200 pt-6 text-[13px] text-slate-600">
            <p>Yours sincerely,</p>
            <p className="mt-8 font-medium text-slate-800">Admissions Office</p>
            <p className="text-slate-500">{data.institution_name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

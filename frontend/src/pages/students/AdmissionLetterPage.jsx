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
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          body * { visibility: hidden; }
          .admission-letter-print,
          .admission-letter-print * { visibility: visible; }
          .admission-letter-print {
            position: absolute; left: 0; top: 0;
            width: 100%; background: white;
          }
          .admission-letter-print .no-print { display: none !important; }
        }
      `}</style>
      <div className="admission-letter-print min-h-screen bg-slate-100 print:bg-white">
        <div className="mx-auto max-w-4xl p-5 print:max-w-none print:p-0">
          <div className="no-print mb-4 flex items-center justify-between">
          <button type="button" onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <FormButton onClick={handlePrint}>
            <Printer className="mr-1.5 h-4 w-4" /> Print Letter
          </FormButton>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm print:rounded-none print:border-none print:shadow-none print:text-[12px]">
          <div className="border-b border-slate-200 px-6 pb-3 pt-5 text-center print:px-6 print:pb-3 print:pt-4">
            {data.logo_url ? (
              <img
                src={data.logo_url}
                alt={`${data.institution_name} logo`}
                className="mx-auto mb-2 h-14 object-contain print:h-12"
              />
            ) : null}
            <h1 className="text-[20px] font-bold text-slate-900 print:text-[18px]">{data.institution_name}</h1>
            {data.institution_motto ? (
              <p className="mt-0.5 text-[12px] italic text-slate-500 print:text-[10px]">{data.institution_motto}</p>
            ) : null}
            <p className="mt-1 text-[10px] text-slate-500 print:text-[9px]">
              {[data.postal_address, data.telephone, data.email, data.website].filter(Boolean).join("  |  ")}
            </p>
          </div>

          <div className="px-6 py-4 print:px-6 print:py-4">
            <div className="mb-3 flex items-start justify-between text-[11px] print:mb-3 print:text-[10px]">
              <div>
                <p><span className="font-medium text-slate-500">Ref:</span> <span className="text-slate-800">{data.reference_number}</span></p>
                <p><span className="font-medium text-slate-500">Date:</span> <span className="text-slate-800">{data.date}</span></p>
              </div>
              {data.enrolment_status ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold capitalize text-emerald-700 print:text-[8px]">
                  {data.enrolment_status}
                </span>
              ) : null}
            </div>

            <div className="mb-3 print:mb-3">
              <p className="text-[13px] leading-6 text-slate-700 print:text-[11px] print:leading-5">
                Dear <span className="font-semibold text-slate-900">{data.first_name ?? data.student_name}</span>,
              </p>
              <p className="mt-3 text-[13px] leading-6 text-slate-700 font-medium print:text-[11px] print:leading-5">
                RE: OFFER OF ADMISSION &mdash; {data.course_name}
              </p>
              <p className="mt-3 text-[13px] leading-6 text-slate-700 print:text-[11px] print:leading-5">
                We are pleased to inform you that you have been offered admission to <strong>{data.institution_name}</strong> to pursue <strong>{data.course_name}</strong> under the {data.curriculum_name} curriculum, leading to <strong>{data.certification_level_name}</strong> certification awarded by {data.certification_authority_name}. Your admission number is <strong>{data.admission_number}</strong>.
              </p>
              {data.session_start_date ? (
                <p className="mt-3 text-[13px] leading-6 text-slate-700 print:text-[11px] print:leading-5">
                  Your studies will commence on <strong>{data.session_start_date}</strong> during the {data.academic_session_name} session of the {data.academic_year_name} academic year, under the {data.department_name} department. The programme has a duration of <strong>{data.duration_months} months</strong>.
                </p>
              ) : null}
            </div>

             <div className="mb-3 overflow-hidden rounded-lg border border-slate-200 print:rounded print:mb-3 print:text-[10px]">
              <table className="w-full text-[11px] print:text-[10px]">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-700 print:px-3 print:py-1.5" colSpan="4">
                      Admission Summary
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-500 print:px-3 print:py-1.5 w-[1%] whitespace-nowrap">Student name</td>
                    <td className="px-3 py-2 text-slate-800 print:px-3 print:py-1.5">{data.student_name}</td>
                    <td className="px-3 py-2 font-medium text-slate-500 print:px-3 print:py-1.5 w-[1%] whitespace-nowrap">Admission number</td>
                    <td className="px-3 py-2 text-slate-800 print:px-3 print:py-1.5">{data.admission_number}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-500 print:px-3 print:py-1.5 w-[1%] whitespace-nowrap">Course</td>
                    <td className="px-3 py-2 text-slate-800 print:px-3 print:py-1.5">{data.course_name} ({data.course_code})</td>
                    <td className="px-3 py-2 font-medium text-slate-500 print:px-3 print:py-1.5 w-[1%] whitespace-nowrap">Curriculum</td>
                    <td className="px-3 py-2 text-slate-800 print:px-3 print:py-1.5">{data.curriculum_name ?? "—"}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-500 print:px-3 print:py-1.5 w-[1%] whitespace-nowrap">Certification level</td>
                    <td className="px-3 py-2 text-slate-800 print:px-3 print:py-1.5">{data.certification_level_name ?? "—"}</td>
                    <td className="px-3 py-2 font-medium text-slate-500 print:px-3 print:py-1.5 w-[1%] whitespace-nowrap">Certifying authority</td>
                    <td className="px-3 py-2 text-slate-800 print:px-3 print:py-1.5">{data.certification_authority_name ?? "—"}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-500 print:px-3 print:py-1.5 w-[1%] whitespace-nowrap">Department</td>
                    <td className="px-3 py-2 text-slate-800 print:px-3 print:py-1.5">{data.department_name ?? "—"}</td>
                    <td className="px-3 py-2 font-medium text-slate-500 print:px-3 print:py-1.5 w-[1%] whitespace-nowrap">Academic session</td>
                    <td className="px-3 py-2 text-slate-800 print:px-3 print:py-1.5">
                      {[data.academic_session_name, data.academic_year_name].filter(Boolean).join(" - ")}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-slate-500 print:px-3 print:py-1.5 w-[1%] whitespace-nowrap">Duration</td>
                    <td className="px-3 py-2 text-slate-800 print:px-3 print:py-1.5">{data.duration_months ? `${data.duration_months} months` : data.duration ?? "—"}</td>
                    {data.session_start_date ? (
                      <>
                        <td className="px-3 py-2 font-medium text-slate-500 print:px-3 print:py-1.5 w-[1%] whitespace-nowrap">Reporting date</td>
                        <td className="px-3 py-2 text-slate-800 print:px-3 print:py-1.5">{data.session_start_date}</td>
                      </>
                    ) : (
                      <td className="px-3 py-2 text-slate-800 print:px-3 print:py-1.5" colSpan="2" />
                    )}
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mb-3 text-[12px] leading-6 text-slate-600 print:text-[10px] print:leading-5 print:mb-3">
              <p>
                To secure your place, kindly settle the applicable fees as outlined in your fee statement. You will also be required to bring the following on your reporting date: a copy of this letter, national identification, passport-size photographs, and your original academic certificates for verification.
              </p>
            </div>

            <div className="mb-3 rounded-lg border border-sky-100 bg-sky-50 p-4 text-[12px] print:text-[10px] print:p-4 print:mb-3">
              <h3 className="mb-1 font-semibold text-sky-800">Student Portal Access</h3>
              <p className="text-sky-700">
                You can access the student portal at: <strong>{data.portal_url}</strong>
              </p>
              {data.login_id ? (
                <p className="mt-1 text-sky-700">
                  Your login ID is: <strong>{data.login_id}</strong>
                </p>
              ) : null}
              {data.default_password ? (
                <p className="mt-1 text-sky-700">
                  Your default password is: <strong>{data.default_password}</strong>. You are required to change your password on first login.
                </p>
              ) : null}
            </div>

            <div className="border-t border-slate-200 pt-5 text-[12px] text-slate-600 print:text-[10px] print:pt-6">
              <p>Yours sincerely,</p>
              <p className="mt-10 font-medium text-slate-800 print:mt-8">Registrar</p>
              <p className="text-slate-500">{data.institution_name}</p>
            </div>

            <div className="mt-5 border-t border-slate-200 pt-2 text-[9px] text-slate-400 text-center print:text-[8px] print:mt-4">
              This is an official admission letter. Verify authenticity at {data.website ?? data.institution_name} using reference {data.reference_number}.
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Plus, X } from "lucide-react";

import { bodyTextClassName, labelTextClassName, selectClassName, inputClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useMarksApi } from "@/hooks/useMarksApi";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const ASSESSMENT_TYPES = [
  "CAT 1", "CAT 2", "CAT 3", "ASSIGNMENT 1", "ASSIGNMENT 2",
  "MAIN EXAM", "PRACTICAL", "PROJECT", "QUIZ 1", "QUIZ 2",
];

export function AddMarksPage() {
  const marksApi = useMarksApi();
  const sessionsApi = useAcademicSessionsApi();

  const [sessions, setSessions] = useState([]);
  const [units, setUnits] = useState([]);
  const [students, setStudents] = useState([]);

  const [selectedSession, setSelectedSession] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [assessmentType, setAssessmentType] = useState(ASSESSMENT_TYPES[0]);
  const [assessmentNumber, setAssessmentNumber] = useState(1);
  const [marksEntries, setMarksEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [sessionsRes] = await Promise.all([
          sessionsApi.list({ per_page: 50, sort_direction: "desc" }),
        ]);
        if (mounted) {
          setSessions(sessionsRes.data ?? []);
        }
      } catch (e) {
        setError(getApiErrorMessage(e, "Failed to load sessions."));
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!selectedSession) return;
    let mounted = true;
    async function load() {
      try {
        const res = await marksApi.availableUnits({ academic_session_id: selectedSession });
        if (mounted) setUnits(res.data ?? []);
      } catch (e) {
        setError(getApiErrorMessage(e, "Failed to load units."));
      }
    }
    load();
    return () => { mounted = false; };
  }, [selectedSession]);

  useEffect(() => {
    if (!selectedSession || !selectedUnit) return;
    let mounted = true;
    async function load() {
      try {
        const res = await marksApi.availableStudents({
          academic_session_id: selectedSession,
          unit_id: selectedUnit,
        });
        if (mounted) {
          setStudents(res.data ?? []);
          setMarksEntries(
            (res.data ?? []).map((s) => ({
              student_id: s.id,
              student_name: s.name,
              admission_number: s.admission_number,
              marks: "",
            })),
          );
        }
      } catch (e) {
        setError(getApiErrorMessage(e, "Failed to load students."));
      }
    }
    load();
    return () => { mounted = false; };
  }, [selectedSession, selectedUnit]);

  function handleMarksChange(index, value) {
    const num = Math.min(100, Math.max(0, Number(value) || 0));
    setMarksEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, marks: num } : entry)),
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const validMarks = marksEntries.filter((m) => m.marks !== "" && Number(m.marks) >= 0);

    if (validMarks.length === 0) {
      setError("No marks to submit. Please enter at least one mark.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        marks: validMarks.map((m) => ({
          academic_session_id: selectedSession,
          academic_session_enrolment_id: null,
          student_id: m.student_id,
          unit_id: selectedUnit,
          assessment_type: assessmentType,
          assessment_number: assessmentNumber,
          marks: Number(m.marks),
        })),
      };

      const res = await marksApi.bulkStore(payload);
      const submitted = res.created_count ?? 0;
      const errors = res.error_count ?? 0;

      if (submitted > 0) toast.success(`${submitted} mark(s) submitted.`);
      if (errors > 0) toast.error(`${errors} duplicate(s) skipped.`);

      setMarksEntries((prev) =>
        prev.map((m) => ({ ...m, marks: "" })),
      );
      setAssessmentNumber((prev) => prev + 1);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to submit marks."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Add Marks</h1>
        <p className="text-[13px] text-slate-500">Record student marks for a unit assessment</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Academic Session</label>
              <select
                value={selectedSession}
                onChange={(e) => { setSelectedSession(e.target.value); setSelectedUnit(""); setStudents([]); }}
                className={`${selectClassName} w-full`}
                required
              >
                <option value="">Select session</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Unit</label>
              <select
                value={selectedUnit}
                onChange={(e) => { setSelectedUnit(e.target.value); }}
                className={`${selectClassName} w-full`}
                required
                disabled={!selectedSession}
              >
                <option value="">Select unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.code} — {u.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Assessment Type</label>
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value)}
                className={`${selectClassName} w-full`}
              >
                {ASSESSMENT_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Assessment #</label>
              <input
                type="number"
                min={1}
                max={100}
                value={assessmentNumber}
                onChange={(e) => setAssessmentNumber(Number(e.target.value) || 1)}
                className={inputClassName}
              />
            </div>
          </div>
        </div>

        {error ? (
          <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
        ) : null}

        {students.length > 0 ? (
          <div className="rounded-xl border border-slate-200/80 bg-white p-5">
            <h2 className="mb-4 text-[15px] font-semibold text-slate-900">
              Students — {assessmentType} #{assessmentNumber}
            </h2>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-left text-[13px]">
                <thead className="text-slate-500">
                  <tr className="border-b border-slate-100">
                    <th className="pb-2 pr-4 font-medium">#</th>
                    <th className="pb-2 pr-4 font-medium">Admission</th>
                    <th className="pb-2 pr-4 font-medium">Student Name</th>
                    <th className="pb-2 font-medium">Marks (0-100)</th>
                  </tr>
                </thead>
                <tbody>
                  {marksEntries.map((entry, index) => (
                    <tr key={entry.student_id} className="border-b border-slate-50">
                      <td className="py-2 pr-4 text-slate-400">{index + 1}</td>
                      <td className="py-2 pr-4 text-slate-600">{entry.admission_number}</td>
                      <td className="py-2 pr-4 text-slate-800">{entry.student_name}</td>
                      <td className="py-2">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={entry.marks}
                          onChange={(e) => handleMarksChange(index, e.target.value)}
                          className={`${inputClassName} w-24`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : selectedSession && selectedUnit ? (
          <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
            No students found for this unit and session.
          </div>
        ) : null}

        {students.length > 0 ? (
          <div className="flex justify-end">
            <FormButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : `Submit ${marksEntries.filter((m) => m.marks !== "").length} Mark(s)`}
            </FormButton>
          </div>
        ) : null}
      </form>
    </section>
  );
}

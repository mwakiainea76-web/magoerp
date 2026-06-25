import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { bodyTextClassName, inputClassName, labelTextClassName, selectClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { useMarksApi } from "@/hooks/useMarksApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const ASSESSMENT_TYPES = ["CAT 1", "CAT 2", "CAT 3", "PRAC 1", "PRAC 2", "PRAC 3"];

export function AddMarksPage() {
  const marksApi = useMarksApi();
  const sessionsApi = useAcademicSessionsApi();

  const [sessions, setSessions] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [studentAdmissionNumber, setStudentAdmissionNumber] = useState("");
  const [assessmentType, setAssessmentType] = useState(ASSESSMENT_TYPES[0]);
  const [score, setScore] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await sessionsApi.list({ per_page: 50, sort_direction: "desc" });
        if (mounted) setSessions(res.data ?? []);
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load sessions."));
      }
    }
    load();
    return () => { mounted = false; };
  }, [sessionsApi]);

  useEffect(() => {
    if (!selectedSession) {
      setUnits([]);
      setSelectedUnit("");
      return undefined;
    }

    let mounted = true;
    async function load() {
      try {
        const res = await marksApi.availableUnits({ academic_session_id: selectedSession });
        if (mounted) setUnits(res.data ?? []);
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load units."));
      }
    }
    load();
    return () => { mounted = false; };
  }, [marksApi, selectedSession]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const numericScore = Number(score);
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100) {
      setError("Score must be between 0 and 100.");
      return;
    }

    setIsSubmitting(true);
    try {
      await marksApi.create({
        academic_session_id: selectedSession,
        unit_id: selectedUnit,
        student_admission_number: studentAdmissionNumber.trim(),
        assessment_type: assessmentType,
        score: numericScore,
      });

      toast.success("Score recorded.");
      setStudentAdmissionNumber("");
      setScore("");
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to submit score."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Add Marks</h1>
        <p className="text-[13px] text-slate-500">Record a score for a registered student unit assessment</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Academic Session</label>
              <select
                value={selectedSession}
                onChange={(e) => {
                  setSelectedSession(e.target.value);
                  setSelectedUnit("");
                }}
                className={`${selectClassName} w-full`}
                required
              >
                <option value="">Select session</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>{session.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Unit</label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className={`${selectClassName} w-full`}
                required
                disabled={!selectedSession}
              >
                <option value="">Select unit</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.code} - {unit.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Admission Number</label>
              <input
                type="text"
                value={studentAdmissionNumber}
                onChange={(e) => setStudentAdmissionNumber(e.target.value)}
                className={inputClassName}
                placeholder="e.g. ADM/001/26"
                required
              />
            </div>

            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Assessment Type</label>
              <select
                value={assessmentType}
                onChange={(e) => setAssessmentType(e.target.value)}
                className={`${selectClassName} w-full`}
                required
              >
                {ASSESSMENT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Score</label>
              <input
                type="number"
                min={0}
                max={100}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className={inputClassName}
                required
              />
            </div>
          </div>
        </div>

        {error ? (
          <div className={`whitespace-pre-wrap rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
        ) : null}

        <div className="flex justify-end">
          <FormButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Score"}
          </FormButton>
        </div>
      </form>
    </section>
  );
}

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeftRight, Search, UserCheck } from "lucide-react";

import { FormInput } from "@/components/FormInput";
import { bodyTextClassName, labelTextClassName, inputClassName, selectClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useCourseChangeApi } from "@/hooks/useCourseChangeApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function CourseChangePage() {
  const api = useCourseChangeApi();

  const [admissionInput, setAdmissionInput] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [student, setStudent] = useState(null);
  const [lookupError, setLookupError] = useState("");

  const [mappings, setMappings] = useState({});
  const [selectedMappingId, setSelectedMappingId] = useState("");
  const [notes, setNotes] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  const [transferResult, setTransferResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  async function handleLookup(event) {
    event.preventDefault();
    if (!admissionInput.trim()) return;

    setIsLookingUp(true);
    setLookupError("");
    setStudent(null);
    setMappings({});
    setSelectedMappingId("");
    setTransferResult(null);
    setHistory([]);

    try {
      const res = await api.lookupStudent(admissionInput.trim());
      const found = res.data;
      setStudent(found);

      const mappingsRes = await api.availableMappings(found.id);
      setMappings(mappingsRes.data ?? {});
    } catch (e) {
      setLookupError(getApiErrorMessage(e, "Student not found."));
    } finally {
      setIsLookingUp(false);
    }
  }

  async function handleTransfer() {
    if (!student || !selectedMappingId) return;

    setIsTransferring(true);
    try {
      const res = await api.transfer({
        student_id: student.id,
        to_curriculum_mapping_id: selectedMappingId,
        notes,
      });
      setTransferResult(res.data);
      toast.success("Course transfer completed successfully.");
      setSelectedMappingId("");
      setNotes("");
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Transfer failed."));
    } finally {
      setIsTransferring(false);
    }
  }

  async function loadHistory() {
    if (!student) return;
    try {
      const res = await api.history(student.id);
      setHistory(res.data ?? []);
      setShowHistory(true);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to load history."));
    }
  }

  function handleReset() {
    setAdmissionInput("");
    setStudent(null);
    setMappings({});
    setSelectedMappingId("");
    setNotes("");
    setTransferResult(null);
    setLookupError("");
    setHistory([]);
    setShowHistory(false);
  }

  const selectedMapping = Object.values(mappings)
    .flat()
    .find((m) => m.id === selectedMappingId);

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Course Change</h1>
          <p className="text-[13px] text-slate-500">Transfer a student to a different course</p>
        </div>
      </div>

      {!student ? (
        <form
          onSubmit={handleLookup}
          className="rounded-xl border border-slate-200/80 bg-white p-5"
        >
          <h2 className="mb-4 text-[15px] font-semibold text-slate-900">Find Student</h2>

          {lookupError ? (
            <div className={`mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>
              {lookupError}
            </div>
          ) : null}

          <div className="flex gap-3">
            <FormInput
              value={admissionInput}
              onChange={(e) => setAdmissionInput(e.target.value)}
              label="Admission Number"
              placeholder="Enter admission number..."
              className="flex-1"
            />
            <FormButton type="submit" disabled={isLookingUp || !admissionInput.trim()}>
              <Search className="mr-1.5 h-4 w-4" />
              {isLookingUp ? "Looking up..." : "Look Up"}
            </FormButton>
          </div>
        </form>
      ) : null}

      {student ? (
        <>
          <div className="rounded-xl border border-slate-200/80 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-slate-900">Student Details</h2>
              <div className="flex gap-2">
                <FormButton type="button" variant="secondary" onClick={loadHistory}>
                  View History
                </FormButton>
                <FormButton type="button" variant="secondary" onClick={handleReset}>
                  New Lookup
                </FormButton>
              </div>
            </div>

            <div className="grid gap-4 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <span className="font-medium text-slate-500">Name:</span>
                <span className="ml-2 text-slate-700">{student.full_name}</span>
              </div>
              <div>
                <span className="font-medium text-slate-500">Admission #:</span>
                <span className="ml-2 text-slate-700">{student.admission_number}</span>
              </div>
              <div>
                <span className="font-medium text-slate-500">Current Course:</span>
                <span className="ml-2 text-slate-700">{student.course_name}</span>
              </div>
              <div>
                <span className="font-medium text-slate-500">Status:</span>
                <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  student.enrolment_status === "enrolled"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}>
                  {student.enrolment_status ?? "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-5">
            <h2 className="mb-4 text-[15px] font-semibold text-slate-900">Select New Course</h2>

            {Object.keys(mappings).length === 0 ? (
              <div className={`text-slate-500 ${bodyTextClassName}`}>
                No other courses available for transfer. Ensure there are active course curricula for other courses.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>New Course & Curriculum</label>
                  <select
                    value={selectedMappingId}
                    onChange={(e) => setSelectedMappingId(e.target.value)}
                    className={`${selectClassName} w-full`}
                  >
                    <option value="">Select a course...</option>
                    {Object.entries(mappings).map(([courseName, mList]) => (
                      <optgroup key={courseName} label={courseName}>
                        {mList.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.course_code} — {m.curriculum_name}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {selectedMapping ? (
                  <div className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3">
                    <div className="flex items-start gap-3">
                      <UserCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
                      <div>
                        <p className="text-[13px] font-medium text-sky-800">
                          Transfer to {selectedMapping.course_name} ({selectedMapping.course_code})
                        </p>
                        <p className="mt-0.5 text-[12px] text-sky-600">
                          Curriculum: {selectedMapping.curriculum_name}
                        </p>
                        <p className="mt-2 text-[12px] text-sky-600">
                          The student's admission number and login ID will be updated to reflect the new course.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div>
                  <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Transfer Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className={`${inputClassName} min-h-[80px] w-full resize-y py-3`}
                    placeholder="Reason for course change..."
                    maxLength={1000}
                  />
                </div>

                <div className="flex justify-end">
                  <FormButton
                    onClick={handleTransfer}
                    disabled={isTransferring || !selectedMappingId}
                  >
                    <ArrowLeftRight className="mr-1.5 h-4 w-4" />
                    {isTransferring ? "Processing..." : "Confirm Course Change"}
                  </FormButton>
                </div>
              </div>
            )}
          </div>

          {transferResult ? (
            <div className="rounded-xl border border-emerald-200/80 bg-emerald-50 p-5">
              <h2 className="mb-3 text-[15px] font-semibold text-emerald-900">Transfer Completed</h2>
              <div className="grid gap-3 text-[13px] sm:grid-cols-2">
                <div>
                  <span className="font-medium text-emerald-700">Old Admission #:</span>
                  <span className="ml-2 text-emerald-900">{transferResult.old_admission_number}</span>
                </div>
                <div>
                  <span className="font-medium text-emerald-700">New Admission #:</span>
                  <span className="ml-2 text-emerald-900">{transferResult.new_admission_number}</span>
                </div>
                <div>
                  <span className="font-medium text-emerald-700">Changed At:</span>
                  <span className="ml-2 text-emerald-900">{transferResult.changed_at}</span>
                </div>
              </div>
            </div>
          ) : null}

          {showHistory && history.length > 0 ? (
            <div className="rounded-xl border border-slate-200/80 bg-white p-5">
              <h2 className="mb-4 text-[15px] font-semibold text-slate-900">Transfer History</h2>
              <div className="space-y-3">
                {history.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-slate-100 px-4 py-3">
                    <div className="grid gap-2 text-[13px] sm:grid-cols-3">
                      <div>
                        <span className="font-medium text-slate-500">Old:</span>
                        <span className="ml-2 text-slate-700">{entry.old_admission_number}</span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-500">New:</span>
                        <span className="ml-2 text-slate-700">{entry.new_admission_number}</span>
                      </div>
                      <div>
                        <span className="font-medium text-slate-500">Date:</span>
                        <span className="ml-2 text-slate-700">{entry.changed_at}</span>
                      </div>
                    </div>
                    {entry.notes ? (
                      <p className="mt-2 text-[12px] text-slate-500">Note: {entry.notes}</p>
                    ) : null}
                    <p className="mt-1 text-[12px] text-slate-400">
                      Processed by: {entry.processed_by}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : showHistory ? (
            <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-8 text-center text-slate-500 ${bodyTextClassName}`}>
              No previous transfers found for this student.
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";

import { bodyTextClassName, inputClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useAttendanceApi } from "@/hooks/useAttendanceApi";
import { getApiErrorMessage } from "@/lib/api/authClient";
import { useAuthStore } from "@/store/authStore";

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "late", label: "Late" },
  { value: "excused", label: "Excused" },
];

function formatDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${m}/${d}/${y}`;
}

export function AttendanceMarkPage() {
  const attendanceApi = useAttendanceApi();
  const role = useAuthStore((state) => state.user?.role);
  const attendanceBasePath = role === "trainer" ? "/trainer/attendance" : "/admin/attendance";
  const [searchParams] = useSearchParams();
  const unitId = searchParams.get("unit_id") ?? "";
  const sessionDate = searchParams.get("session_date") ?? "";
  const startTime = searchParams.get("start_time") ?? "";

  const [students, setStudents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [markAllStatus, setMarkAllStatus] = useState("");

  useEffect(() => {
    if (!unitId || !sessionDate || !startTime) return;
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const res = await attendanceApi.roster({ unit_id: unitId, session_date: sessionDate, start_time: startTime });
        if (mounted) setStudents(res.data ?? []);
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load roster."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [unitId, sessionDate, startTime, attendanceApi]);

  function getStatus(student) {
    if (student.attendance_status) return student.attendance_status;
    const stored = localStorage.getItem(`attendance_${student.unit_enrolment_id}_${sessionDate}_${startTime}`);
    return stored ?? "present";
  }

  function setStatus(student, status) {
    localStorage.setItem(`attendance_${student.unit_enrolment_id}_${sessionDate}_${startTime}`, status);
    setStudents((prev) =>
      prev.map((s) =>
        s.unit_enrolment_id === student.unit_enrolment_id ? { ...s, _localStatus: status } : s,
      ),
    );
  }

  function handleMarkAll() {
    if (!markAllStatus) return;
    setStudents((prev) =>
      prev.map((s) => {
        localStorage.setItem(`attendance_${s.unit_enrolment_id}_${sessionDate}_${startTime}`, markAllStatus);
        return { ...s, _localStatus: markAllStatus };
      }),
    );
    toast.success(`All marked as ${markAllStatus}`);
  }

  const filteredStudents = students.filter((s) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      s.admission_number?.toLowerCase().includes(q) ||
      s.name?.toLowerCase().includes(q)
    );
  });

  async function handleSubmit() {
    setIsSubmitting(true);
    setError("");

    const records = students.map((s) => ({
      unit_enrolment_id: s.unit_enrolment_id,
      status: getStatus(s),
    }));

    try {
      await attendanceApi.mark({
        unit_id: unitId,
        session_date: sessionDate,
        start_time: startTime,
        records,
      });
      toast.success("Attendance saved successfully.");

      students.forEach((s) => {
        localStorage.removeItem(`attendance_${s.unit_enrolment_id}_${sessionDate}_${startTime}`);
      });
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to save attendance."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!unitId || !sessionDate || !startTime) {
    return (
      <section className="space-y-5">
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
          Missing required parameters. <Link to={attendanceBasePath} className="font-medium text-emerald-600 underline">Go back</Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Mark Attendance</h1>
          <p className="text-[13px] text-slate-500">
            {formatDate(sessionDate)} - {startTime}
          </p>
        </div>
        <Link to={attendanceBasePath} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-medium text-slate-600 transition hover:bg-slate-50">
          Back
        </Link>
      </div>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label htmlFor="search" className="mb-1 block text-[13px] font-medium text-slate-600">Search student</label>
            <input
              id="search"
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="By admission number or name..."
              className={inputClassName}
            />
          </div>
          <div className="min-w-[150px]">
            <label htmlFor="markAll" className="mb-1 block text-[13px] font-medium text-slate-600">Mark all as</label>
            <select
              id="markAll"
              value={markAllStatus}
              onChange={(e) => setMarkAllStatus(e.target.value)}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition"
            >
              <option value="">Select...</option>
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <FormButton type="button" variant="secondary" onClick={handleMarkAll} disabled={!markAllStatus}>
            Apply
          </FormButton>
        </div>
      </div>

      {isLoading ? (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>Loading roster...</div>
      ) : filteredStudents.length === 0 ? (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
          {students.length === 0 ? "No students registered for this unit." : "No students match your search."}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200/80 bg-white">
          <div className="divide-y divide-slate-100">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-4 px-5 py-3 text-[12px] font-semibold uppercase tracking-wider text-slate-500">
              <div>Admission</div>
              <div>Name</div>
              <div>Status</div>
            </div>
            {filteredStudents.map((student) => (
              <div key={student.unit_enrolment_id} className="grid grid-cols-[1fr_1fr_auto] gap-4 px-5 py-3 transition hover:bg-slate-50">
                <div className="flex items-center text-[14px] text-slate-700">{student.admission_number}</div>
                <div className="flex items-center text-[14px] font-medium text-slate-800">{student.name}</div>
                <div>
                  <select
                    value={getStatus(student)}
                    onChange={(e) => setStatus(student, e.target.value)}
                    className={`h-8 rounded-lg border px-3 text-[13px] font-medium outline-none transition ${
                      getStatus(student) === "present"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : getStatus(student) === "absent"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : getStatus(student) === "late"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {students.length > 0 ? (
        <div className="flex justify-end">
          <FormButton type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : `Save Attendance (${students.length} students)`}
          </FormButton>
        </div>
      ) : null}
    </section>
  );
}

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { bodyTextClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { useAttendanceApi } from "@/hooks/useAttendanceApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function AttendanceIndexPage() {
  const attendanceApi = useAttendanceApi();
  const navigate = useNavigate();

  const [units, setUnits] = useState([]);
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState("08:00");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const res = await attendanceApi.assignedUnits();
        if (mounted) setUnits(res.data ?? []);
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load assigned units."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [attendanceApi]);

  function handleProceed() {
    if (!selectedUnitId) return;
    const params = new URLSearchParams({
      unit_id: selectedUnitId,
      session_date: sessionDate,
      start_time: startTime,
    });
    navigate(`/attendance/mark?${params.toString()}`);
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Class Attendance</h1>
        <p className="text-[13px] text-slate-500">Select unit, date, and time to mark attendance</p>
      </div>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        {isLoading ? (
          <div className={`py-10 text-center text-slate-500 ${bodyTextClassName}`}>Loading assigned units...</div>
        ) : units.length === 0 ? (
          <div className={`py-10 text-center text-slate-500 ${bodyTextClassName}`}>
            No units assigned to you. Contact an administrator to get unit assignments.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="unit" className="mb-1 block text-[13px] font-medium text-slate-600">Unit</label>
              <select
                id="unit"
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition"
              >
                <option value="">Select a unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.code} - {u.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="date" className="mb-1 block text-[13px] font-medium text-slate-600">Date</label>
              <input
                id="date"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition"
              />
            </div>
            <div>
              <label htmlFor="time" className="mb-1 block text-[13px] font-medium text-slate-600">Start Time</label>
              <input
                id="time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-200 bg-white px-4 text-[14px] leading-5 text-slate-700 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition"
              />
            </div>
          </div>
        )}

        {units.length > 0 ? (
          <div className="mt-5 flex justify-end">
            <FormButton type="button" onClick={handleProceed} disabled={!selectedUnitId}>
              Proceed to Mark Attendance
            </FormButton>
          </div>
        ) : null}
      </div>
    </section>
  );
}
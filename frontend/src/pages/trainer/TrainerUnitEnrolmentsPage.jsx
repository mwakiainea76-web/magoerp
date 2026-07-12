import { useCallback, useEffect, useState } from "react";
import { Frown, LoaderCircle, Search } from "lucide-react";

import { bodyTextClassName, inputClassName, selectClassName } from "@/lib/styles";
import { LookupSelect } from "@/components/LookupSelect";
import { Table, TableWrapper, Thead, Th, Tbody, Td } from "@/components/DataTable";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { useAcademicSessionEnrolmentsApi } from "@/hooks/useAcademicSessionEnrolmentsApi";
import { authClient } from "@/lib/api/authClient";

export function TrainerUnitEnrolmentsPage() {
  const sessionsApi = useAcademicSessionsApi();
  const enrolmentsApi = useAcademicSessionEnrolmentsApi();

  const [sessions, setSessions] = useState([]);
  const [filterSession, setFilterSession] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterUnitOption, setFilterUnitOption] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assignedUnits, setAssignedUnits] = useState([]);
  const [unitsLoaded, setUnitsLoaded] = useState(false);

  useEffect(() => {
    sessionsApi.list({ per_page: 50, sort_direction: "desc" }).then((res) => {
      setSessions(res.data ?? []);
    }).catch(() => {});
  }, [sessionsApi]);

  useEffect(() => {
    authClient.get("/attendance/assigned-units").then((res) => {
      setAssignedUnits(res.data?.data ?? []);
    }).catch(() => {}).finally(() => setUnitsLoaded(true));
  }, []);

  const fetchUnits = useCallback(async (query) => {
    const res = await authClient.get("/attendance/assigned-units");
    const units = res.data?.data ?? [];
    if (!query) return units.map((u) => ({ id: u.id, label: `${u.code} - ${u.name}` }));
    return units
      .filter((u) => u.code.toLowerCase().includes(query.toLowerCase()) || u.name.toLowerCase().includes(query.toLowerCase()))
      .map((u) => ({ id: u.id, label: `${u.code} - ${u.name}` }));
  }, []);

  useEffect(() => {
    if (!filterSession || !filterUnit) {
      setStudents([]);
      return;
    }
    setLoading(true);
    authClient.get("/academic-session-enrolments/unit", {
      params: { academic_session_id: filterSession, unit_id: filterUnit },
    }).then((res) => {
      setStudents(res.data?.data ?? []);
    }).catch(() => {
      setStudents([]);
    }).finally(() => setLoading(false));
  }, [filterSession, filterUnit]);

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Unit Enrolments</h1>
        <p className={`mt-1 text-slate-500 ${bodyTextClassName}`}>
          View students enrolled in a unit for a given academic session.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="filterSession" className="mb-2 block text-[13px] font-medium text-slate-600">Academic Session</label>
            <select
              id="filterSession"
              value={filterSession}
              onChange={(e) => { setFilterSession(e.target.value); setFilterUnit(""); setFilterUnitOption(null); setStudents([]); }}
              className={`${selectClassName} w-full`}
            >
              <option value="">Select a session</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <LookupSelect
              label="Unit"
              value={filterUnit}
              selectedOption={filterUnitOption}
              onChange={(nextValue, option) => {
                setFilterUnit(nextValue);
                setFilterUnitOption(option);
              }}
              fetchOptions={fetchUnits}
              placeholder={filterSession ? "Search unit" : "Select session first"}
              emptyMessage="No units found"
              disabled={!filterSession}
              clearable
            />
          </div>
        </div>
      </div>

      {filterSession && unitsLoaded && assignedUnits.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <Frown className="size-5 shrink-0" />
          <span>You are not assigned to any units for the selected session. Contact the admin to get assigned.</span>
        </div>
      ) : null}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <LoaderCircle className="size-6 animate-spin text-emerald-500" />
        </div>
      ) : students.length > 0 ? (
        <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <p className={`mb-3 text-sm text-slate-500 ${bodyTextClassName}`}>
            {students.length} student{students.length !== 1 ? "s" : ""} enrolled
          </p>
          <Table>
            <TableWrapper>
              <Thead>
                <tr>
                  <Th className="w-12 text-center">#</Th>
                  <Th>Admission No</Th>
                  <Th>Student Name</Th>
                  <Th>Date Enrolled</Th>
                </tr>
              </Thead>
              <Tbody>
                {students.map((s, i) => (
                  <tr key={s.id}>
                    <Td className="w-12 text-center text-slate-400">{i + 1}</Td>
                    <Td className="font-mono text-sm text-slate-700">{s.admission_number}</Td>
                    <Td className="font-medium text-slate-800">{s.student_name}</Td>
                    <Td className="text-sm text-slate-600">{s.enrolled_at ?? s.created_at}</Td>
                  </tr>
                ))}
              </Tbody>
            </TableWrapper>
          </Table>
        </div>
      ) : filterSession && filterUnit ? (
        <div className="rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-sm text-slate-400">
          No students found for the selected session and unit.
        </div>
      ) : null}
    </section>
  );
}

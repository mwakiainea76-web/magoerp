import { useEffect, useState } from "react";

import { bodyTextClassName, labelTextClassName, selectClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td, TableFooter } from "@/components/DataTable";
import { useMarksApi } from "@/hooks/useMarksApi";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { useUnitsApi } from "@/hooks/useUnitsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function MarksheetPage() {
  const marksApi = useMarksApi();
  const sessionsApi = useAcademicSessionsApi();
  const unitsApi = useUnitsApi();

  const [sessions, setSessions] = useState([]);
  const [units, setUnits] = useState([]);
  const [marksheet, setMarksheet] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSession, setSelectedSession] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [sessionsRes, unitsRes] = await Promise.all([
        sessionsApi.list({ per_page: 50, sort_direction: "desc" }),
        unitsApi.list({ per_page: 200 }),
      ]);
      if (mounted) {
        setSessions(sessionsRes.data ?? []);
        setUnits(unitsRes.data ?? []);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  async function handleGenerate() {
    if (!selectedSession || !selectedUnit) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await marksApi.marksheet({
        academic_session_id: selectedSession,
        unit_id: selectedUnit,
      });
      setMarksheet(res.data ?? null);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to generate marksheet."));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Marksheet</h1>
        <p className="text-[13px] text-slate-500">View marksheet summary for a unit and session</p>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Academic Session</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className={`${selectClassName} w-full`}
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
              onChange={(e) => setSelectedUnit(e.target.value)}
              className={`${selectClassName} w-full`}
            >
              <option value="">Select unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.code} — {u.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <FormButton onClick={handleGenerate} disabled={!selectedSession || !selectedUnit || isLoading}>
              {isLoading ? "Generating..." : "Generate Marksheet"}
            </FormButton>
          </div>
        </div>
      </div>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      {marksheet ? (
        <Table>
          <TableHeader>
            <h2 className="text-[1.0625rem] font-semibold text-slate-900">
              {marksheet.unit?.code} — {marksheet.unit?.name}
              <span className="ml-2 text-[13px] font-normal text-slate-500">({marksheet.academic_session?.name})</span>
            </h2>
          </TableHeader>
          {marksheet.marksheet?.length === 0 ? (
            <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No marks found.</div>
          ) : (
            <TableWrapper>
              <Thead>
                <tr>
                  <Th className="w-10 text-center">#</Th>
                  <Th>Admission</Th>
                  <Th>Student Name</Th>
                  {marksheet.marksheet?.[0]?.types
                    ? Object.keys(marksheet.marksheet[0].types).map((type) => (
                        <Th key={type} className="text-center">{type}</Th>
                      ))
                    : null}
                  <Th className="text-center">Total</Th>
                  <Th className="text-center">Avg</Th>
                </tr>
              </Thead>
              <Tbody>
                {marksheet.marksheet.map((entry, index) => {
                  const typeKeys = Object.keys(entry.types);
                  return (
                    <tr key={entry.student.id}>
                      <Td className="w-10 text-center text-slate-400">{index + 1}</Td>
                      <Td>{entry.student.admission_number}</Td>
                      <Td className="font-medium text-slate-800">{entry.student.name}</Td>
                      {typeKeys.map((type) => {
                        const typeData = entry.types[type];
                        const markValues = Object.values(typeData.marks).map((m) => m.marks);
                        return (
                          <Td key={type} className="text-center">
                            {markValues.length > 0 ? markValues.join(", ") : "—"}
                            <div className="text-[11px] text-slate-400">sum: {typeData.total}</div>
                          </Td>
                        );
                      })}
                      <Td className="text-center font-semibold">{entry.total}</Td>
                      <Td className="text-center font-semibold">{entry.average}</Td>
                    </tr>
                  );
                })}
              </Tbody>
            </TableWrapper>
          )}
        </Table>
      ) : null}
    </section>
  );
}

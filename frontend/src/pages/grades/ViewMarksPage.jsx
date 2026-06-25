import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { Eye, Search } from "lucide-react";

import { bodyTextClassName, labelTextClassName, selectClassName, inputClassName, initialMeta } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td, TableFooter } from "@/components/DataTable";
import { useMarksApi } from "@/hooks/useMarksApi";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function ViewMarksPage() {
  const marksApi = useMarksApi();
  const sessionsApi = useAcademicSessionsApi();

  const [marks, setMarks] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterSession, setFilterSession] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterType, setFilterType] = useState("");
  const [page, setPage] = useState(1);

  const loadSessions = useCallback(async () => {
    try {
      const res = await sessionsApi.list({ per_page: 50, sort_direction: "desc" });
      setSessions(res.data ?? []);
    } catch (e) {
      // silent
    }
  }, []);

  useEffect(() => { loadSessions(); }, []);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    setError("");

    async function load() {
      try {
        const params = { page, per_page: 25 };
        if (filterSession) params.academic_session_id = filterSession;
        if (filterUnit) params.unit_id = filterUnit;
        if (filterType) params.assessment_type = filterType;

        const res = await marksApi.list(params);
        if (mounted) {
          setMarks(res.data ?? []);
          setMeta(res.meta ?? initialMeta);
        }
      } catch (e) {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load marks."));
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [page, filterSession, filterUnit, filterType]);

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">View Marks</h1>
        <p className="text-[13px] text-slate-500">Browse recorded student marks</p>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Academic Session</label>
            <select
              value={filterSession}
              onChange={(e) => { setFilterSession(e.target.value); setPage(1); }}
              className={`${selectClassName} w-full`}
            >
              <option value="">All Sessions</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Assessment Type</label>
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className={`${selectClassName} w-full`}
            >
              <option value="">All Types</option>
              <option value="CAT 1">CAT 1</option>
              <option value="CAT 2">CAT 2</option>
              <option value="CAT 3">CAT 3</option>
              <option value="ASSIGNMENT 1">Assignment 1</option>
              <option value="ASSIGNMENT 2">Assignment 2</option>
              <option value="MAIN EXAM">Main Exam</option>
              <option value="PRACTICAL">Practical</option>
              <option value="PROJECT">Project</option>
            </select>
          </div>
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Unit Code / Name</label>
            <input
              type="text"
              value={filterUnit}
              onChange={(e) => { setFilterUnit(e.target.value); setPage(1); }}
              className={inputClassName}
              placeholder="Search by unit code..."
            />
          </div>
        </div>
      </div>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      <Table>
        <TableHeader>
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">Marks Records</h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading marks...</div>
        ) : marks.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No marks found for the current filters.</div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <Th>Admission</Th>
                <Th>Student</Th>
                <Th>Unit</Th>
                <Th>Assessment</Th>
                <Th>#</Th>
                <Th className="text-center">Marks</Th>
                <Th className="text-center">Status</Th>
              </tr>
            </Thead>
            <Tbody>
              {marks.map((mark, index) => (
                <tr key={mark.id}>
                  <Td className="w-10 text-center text-slate-400">
                    {(meta.current_page - 1) * meta.per_page + index + 1}
                  </Td>
                  <Td>{mark.student?.admission_number ?? "—"}</Td>
                  <Td className="font-medium text-slate-800">
                    {mark.student
                      ? [mark.student.first_name, mark.student.middle_name, mark.student.last_name]
                          .filter(Boolean)
                          .join(" ")
                      : "—"}
                  </Td>
                  <Td>{mark.unit?.code ?? "—"}</Td>
                  <Td>{mark.assessment_type}</Td>
                  <Td>{mark.assessment_number}</Td>
                  <Td className="text-center font-semibold">{mark.marks}</Td>
                  <Td className="text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        mark.is_published
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {mark.is_published ? "Published" : "Draft"}
                    </span>
                  </Td>
                </tr>
              ))}
            </Tbody>
          </TableWrapper>
        )}

        <TableFooter>
          <p className={`text-slate-500 ${bodyTextClassName}`}>
            {meta.total > 0 ? `Showing ${meta.from} to ${meta.to} of ${meta.total} marks` : "No results"}
          </p>
          <div className="flex items-center gap-3">
            <FormButton
              type="button"
              variant="secondary"
              className="h-9 w-auto px-4"
              disabled={meta.current_page <= 1 || isLoading}
              onClick={() => setPage((c) => Math.max(1, c - 1))}
            >Previous</FormButton>
            <span className={`text-slate-500 ${bodyTextClassName}`}>Page {meta.current_page} of {meta.last_page}</span>
            <FormButton
              type="button"
              variant="secondary"
              className="h-9 w-auto px-4"
              disabled={meta.current_page >= meta.last_page || isLoading}
              onClick={() => setPage((c) => c + 1)}
            >Next</FormButton>
          </div>
        </TableFooter>
      </Table>
    </section>
  );
}

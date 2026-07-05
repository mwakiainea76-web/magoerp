import { useEffect, useMemo, useState } from "react";

import { LookupSelect } from "@/components/LookupSelect";
import { bodyTextClassName, labelTextClassName, selectClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { PaginationFooter } from "@/components/PaginationFooter";
import {
  Table,
  TableFooter,
  TableHeader,
  TableWrapper,
  Thead,
  Th,
  Tbody,
  Td,
} from "@/components/DataTable";
import { useMarksApi } from "@/hooks/useMarksApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { useUnitsApi } from "@/hooks/useUnitsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const COLUMN_TYPES = [
  { key: "CAT 1", label: "CAT 1", group: "CAT" },
  { key: "CAT 2", label: "CAT 2", group: "CAT" },
  { key: "CAT 3", label: "CAT 3", group: "CAT" },
  { key: "AVG(CAT)", label: "AVG(CAT)", group: "CAT", isAvg: true },
  { key: "PRAC 1", label: "PRAC 1", group: "PRAC" },
  { key: "PRAC 2", label: "PRAC 2", group: "PRAC" },
  { key: "PRAC 3", label: "PRAC 3", group: "PRAC" },
  { key: "AVG(PRAC)", label: "AVG(PRAC)", group: "PRAC", isAvg: true },
];

function formatMark(value) {
  return value === null || value === undefined ? "-" : value;
}

function getCellValue(entry, key) {
  if (key === "AVG(CAT)") return formatMark(entry.averages?.CAT);
  if (key === "AVG(PRAC)") return formatMark(entry.averages?.PRAC);
  return formatMark(entry.scores?.[key]);
}

export function MarksheetPage({ selfService = false }) {
  const marksApi = useMarksApi();
  const lookupApi = useLookupApi();
  const sessionsApi = useAcademicSessionsApi();
  const unitsApi = useUnitsApi();

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [enrolments, setEnrolments] = useState([]);
  const [selectedEnrolmentId, setSelectedEnrolmentId] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [marksheetData, setMarksheetData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingEnrolments, setIsLoadingEnrolments] = useState(false);
  const [error, setError] = useState("");

  const [sessions, setSessions] = useState([]);
  const [units, setUnits] = useState([]);
  const [selectedAggSession, setSelectedAggSession] = useState("");
  const [selectedAggUnit, setSelectedAggUnit] = useState("");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  const studentId = selfService ? null : (selectedStudent?.id ?? null);

  useEffect(() => {
    if (selfService) return;
    let mounted = true;
    Promise.all([
      sessionsApi.list({ per_page: 100, sort_direction: "desc" }),
      unitsApi.list({ per_page: 200 }),
    ]).then(([sessionsRes, unitsRes]) => {
      if (mounted) {
        setSessions(sessionsRes.data ?? []);
        setUnits(unitsRes.data ?? []);
      }
    }).catch(() => {});
    return () => { mounted = false; };
  }, [selfService, sessionsApi, unitsApi]);

  useEffect(() => {
    setSelectedEnrolmentId("");
    setEnrolments([]);
    setMarksheetData(null);
    setError("");
    setSelectedModule("");

    if (selfService) {
      let mounted = true;
      setIsLoadingEnrolments(true);

      marksApi
        .mySessionEnrolments()
        .then((res) => {
          if (mounted) {
            const items = res.data ?? [];
            setEnrolments(items);
            if (items.length > 0) {
              setSelectedEnrolmentId(items[0].id);
            }
          }
        })
        .catch(() => {})
        .finally(() => {
          if (mounted) setIsLoadingEnrolments(false);
        });

      return () => { mounted = false; };
    }

    if (!studentId) return;

    let mounted = true;
    setIsLoadingEnrolments(true);

    marksApi
      .adminTranscriptEnrolments({ student_id: studentId })
      .then((res) => {
        if (mounted) {
          const items = res.data ?? [];
          setEnrolments(items);
          if (selfService && items.length > 0) {
            setSelectedEnrolmentId(items[0].id);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setIsLoadingEnrolments(false);
      });

    return () => { mounted = false; };
  }, [studentId, selfService, marksApi]);

  const selectedEnrolment = useMemo(
    () => enrolments.find((e) => e.id === selectedEnrolmentId) ?? null,
    [enrolments, selectedEnrolmentId],
  );

  useEffect(() => {
    if (selfService) {
      if (!selectedEnrolmentId) return;
    } else if (!studentId) {
      return;
    }

    let mounted = true;
    setIsLoading(true);
    setError("");

    const params = {};
    if (selectedEnrolmentId) {
      params.session_enrolment_id = selectedEnrolmentId;
    }
    if (selectedModule) {
      params.module = Number(selectedModule);
    }

    const promise = selfService
      ? marksApi.myMarksheet(params)
      : marksApi.adminMarksheet({ ...params, student_id: studentId });

    promise
      .then((res) => {
        if (mounted) setMarksheetData(res.data ?? null);
      })
      .catch((e) => {
        if (mounted) setError(getApiErrorMessage(e, "Failed to load marksheet."));
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => { mounted = false; };
  }, [studentId, selectedEnrolmentId, selectedModule, selfService, marksApi]);

  useEffect(() => {
    setPage(1);
  }, [selectedEnrolmentId, selectedModule]);

  const marksheetRows = marksheetData?.marksheet ?? [];
  const visibleRows = marksheetRows.slice((page - 1) * perPage, page * perPage);
  const student = marksheetData?.student;

  const fetchStudents = (query) =>
    lookupApi
      .search("students", { query, limit: 10 })
      .then((response) => response.data ?? [])
      .catch(() => []);

  async function handleAggGenerate() {
    if (!selectedAggSession || !selectedAggUnit) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await marksApi.marksheet({
        academic_session_id: selectedAggSession,
        unit_id: selectedAggUnit,
      });
      setMarksheetData(res.data ?? null);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to generate marksheet."));
    } finally {
      setIsLoading(false);
    }
  }

  function renderAggregateFilters() {
    return (
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end">
        <div>
          <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Unit</label>
          <select
            value={selectedAggUnit}
            onChange={(e) => setSelectedAggUnit(e.target.value)}
            className={`${selectClassName} w-full`}
          >
            <option value="">Select unit</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>{u.code} — {u.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Academic Session</label>
          <select
            value={selectedAggSession}
            onChange={(e) => setSelectedAggSession(e.target.value)}
            className={`${selectClassName} w-full`}
          >
            <option value="">Select session</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <FormButton onClick={handleAggGenerate} disabled={!selectedAggSession || !selectedAggUnit || isLoading}>
          {isLoading ? "Generating..." : "Generate Marksheet"}
        </FormButton>
      </div>
    );
  }

  function renderStudentFilters() {
    return (
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,200px)_1fr_auto] lg:items-end">
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Session Enrolment</label>
            <select
              value={selectedEnrolmentId}
              onChange={(event) => setSelectedEnrolmentId(event.target.value)}
              className={`${selectClassName} w-full`}
              disabled={isLoadingEnrolments}
            >
              {isLoadingEnrolments ? (
                <option value="">Loading...</option>
              ) : enrolments.length === 0 ? (
                <option value="">No enrolments found</option>
              ) : (
                [(!selfService ? <option key="all" value="">All sessions</option> : null)]
                  .concat(enrolments.map((enrolment) => (
                    <option key={enrolment.id} value={enrolment.id}>
                      {enrolment.label}
                    </option>
                  )))
              )}
            </select>
          </div>

        <div>
          <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Module</label>
          <select
            value={selectedModule}
            onChange={(event) => setSelectedModule(event.target.value)}
            className={`${selectClassName} w-full`}
            disabled={!selectedEnrolmentId}
          >
            <option value="">All modules</option>
            {selectedEnrolment?.module ? (
              <option value={selectedEnrolment.module}>Module {selectedEnrolment.module}</option>
            ) : null}
          </select>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-[13px] text-slate-600">
          <div className="font-semibold text-slate-900">
            {student?.name ?? (selectedStudent?.label ?? "Student")}
          </div>
          <div className="mt-1 text-slate-500">{student?.admission_number ?? ""}</div>
        </div>

        <FormButton
          type="button"
          variant="secondary"
          onClick={() => {
            setSelectedEnrolmentId(selfService ? (enrolments[0]?.id ?? "") : "");
            setSelectedModule("");
          }}
          disabled={!selectedEnrolmentId && !selectedModule}
        >
          Reset
        </FormButton>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Marksheet</h1>
        <p className="text-[13px] text-slate-500">
          {selfService
            ? "Browse your published marksheet by session enrolment"
            : "Search a student or generate a unit marksheet"}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <div className="space-y-4">
          {!selfService ? (
            <div className={studentId ? "lg:w-1/2" : ""}>
              <LookupSelect
                label="Student"
                placeholder="Search by admission number or name"
                value={selectedStudent?.id ?? ""}
                selectedOption={selectedStudent}
                onChange={(id, option) => setSelectedStudent(option)}
                fetchOptions={fetchStudents}
              />
            </div>
          ) : null}

          {selfService || studentId ? renderStudentFilters() : renderAggregateFilters()}
        </div>
      </div>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      {isLoading ? (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading marksheet...</div>
      ) : null}

      {!isLoading && !selfService && !studentId && marksheetData && marksheetData.marksheet?.length === 0 ? (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>No marks found for the selected unit and session.</div>
      ) : null}

      {!isLoading && !selfService && !studentId && marksheetData && marksheetData.marksheet?.length > 0 ? (
        <Table>
          <TableHeader>
            <h2 className="text-[1.0625rem] font-semibold text-slate-900">
              {marksheetData.unit?.code} — {marksheetData.unit?.name}
              <span className="ml-2 text-[13px] font-normal text-slate-500">({marksheetData.academic_session?.name})</span>
            </h2>
          </TableHeader>
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <Th>Admission</Th>
                <Th>Student Name</Th>
                {marksheetData.marksheet?.[0]?.types
                  ? Object.keys(marksheetData.marksheet[0].types).map((type) => (
                      <Th key={type} className="text-center">{type}</Th>
                    ))
                  : null}
                <Th className="text-center">Total</Th>
                <Th className="text-center">Avg</Th>
              </tr>
            </Thead>
            <Tbody>
              {marksheetData.marksheet.map((entry, index) => {
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
        </Table>
      ) : null}

      {!isLoading && !selfService && !studentId ? null : null}

      {!isLoading && !selfService && studentId && marksheetData === null && isLoadingEnrolments ? (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>Loading enrolments...</div>
      ) : null}

      {!isLoading && selfService && !selectedEnrolmentId && !isLoadingEnrolments ? (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>Select a session enrolment to view your marksheet.</div>
      ) : null}

      {!isLoading && !selfService && studentId && marksheetData === null && !isLoadingEnrolments && enrolments.length === 0 ? (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>No session enrolments found for this student.</div>
      ) : null}

      {!isLoading && marksheetData !== null && marksheetRows.length === 0 && (selfService || studentId) ? (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>No published unit marks found for the selected filters.</div>
      ) : null}

      {!isLoading && marksheetData !== null && marksheetRows.length > 0 && (selfService || studentId) ? (
        <Table>
          <TableHeader>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">Marksheet</h2>
              <p className="text-[12px] text-slate-500">{selectedEnrolment?.label}</p>
            </div>
          </TableHeader>
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <Th>Unit Code</Th>
                <Th>Unit</Th>
                {COLUMN_TYPES.map((column) => (
                  <Th key={column.key} className={`text-center ${column.isAvg ? "!text-red-600" : ""}`}>{column.label}</Th>
                ))}
              </tr>
            </Thead>
            <Tbody>
              {visibleRows.map((entry, index) => (
                <tr key={entry.unit.id}>
                  <Td className="w-10 text-center text-slate-400">{(page - 1) * perPage + index + 1}</Td>
                  <Td className="text-slate-700">{entry.unit.code}</Td>
                  <Td className="font-medium text-slate-800">{entry.unit.name}</Td>
                  {COLUMN_TYPES.map((column) => (
                    <Td key={column.key} className={`text-center ${column.isAvg ? "font-semibold !text-red-600" : "text-slate-700"}`}>
                      {getCellValue(entry, column.key)}
                    </Td>
                  ))}
                </tr>
              ))}
            </Tbody>
          </TableWrapper>
          <TableFooter>
            <PaginationFooter
              page={page}
              perPage={perPage}
              total={marksheetRows.length}
              lastPage={Math.max(1, Math.ceil(marksheetRows.length / perPage))}
              onPageChange={setPage}
              onPerPageChange={setPerPage}
            />
          </TableFooter>
        </Table>
      ) : null}
    </section>
  );
}

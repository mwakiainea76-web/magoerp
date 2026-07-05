import { useEffect, useMemo, useState } from "react";

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

export function StudentMarksheetPage() {
  const marksApi = useMarksApi();

  const [enrolments, setEnrolments] = useState([]);
  const [selectedEnrolmentId, setSelectedEnrolmentId] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [marksheetData, setMarksheetData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEnrolments, setIsLoadingEnrolments] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  useEffect(() => {
    let mounted = true;

    async function loadEnrolments() {
      setIsLoadingEnrolments(true);
      try {
        const res = await marksApi.mySessionEnrolments();
        if (mounted) {
          const items = res.data ?? [];
          setEnrolments(items);
          if (items.length > 0 && !selectedEnrolmentId) {
            setSelectedEnrolmentId(items[0].id);
          }
        }
      } catch {
        // silent
      } finally {
        if (mounted) setIsLoadingEnrolments(false);
      }
    }

    loadEnrolments();
    return () => { mounted = false; };
  }, [marksApi, selectedEnrolmentId]);

  const selectedEnrolment = useMemo(
    () => enrolments.find((e) => e.id === selectedEnrolmentId) ?? null,
    [enrolments, selectedEnrolmentId],
  );

  useEffect(() => {
    if (!selectedEnrolmentId) return;

    let mounted = true;
    setIsLoading(true);
    setError("");

    const params = { session_enrolment_id: selectedEnrolmentId };
    if (selectedModule) {
      params.module = Number(selectedModule);
    }

    marksApi
      .myMarksheet(params)
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
  }, [marksApi, selectedEnrolmentId, selectedModule]);

  useEffect(() => {
    setPage(1);
  }, [selectedEnrolmentId, selectedModule]);

  const marksheetRows = marksheetData?.marksheet ?? [];
  const visibleRows = marksheetRows.slice((page - 1) * perPage, page * perPage);
  const student = marksheetData?.student;

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
          Marksheet
        </h1>
        <p className="text-[13px] text-slate-500">
          Browse your published marksheet by session enrolment
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,200px)_1fr_auto] lg:items-end">
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>
              Session Enrolment
            </label>
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
                enrolments.map((enrolment) => (
                  <option key={enrolment.id} value={enrolment.id}>
                    {enrolment.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>
              Module
            </label>
            <select
              value={selectedModule}
              onChange={(event) => setSelectedModule(event.target.value)}
              className={`${selectClassName} w-full`}
              disabled={!selectedEnrolmentId}
            >
              <option value="">All modules</option>
              {selectedEnrolment?.module ? (
                <option value={selectedEnrolment.module}>
                  Module {selectedEnrolment.module}
                </option>
              ) : null}
            </select>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-[13px] text-slate-600">
            <div className="font-semibold text-slate-900">
              {student?.name ?? "Student"}
            </div>
            <div className="mt-1 text-slate-500">
              {student?.admission_number ?? ""}
            </div>
          </div>

          <FormButton
            type="button"
            variant="secondary"
            onClick={() => {
              setSelectedEnrolmentId(enrolments[0]?.id ?? "");
              setSelectedModule("");
            }}
            disabled={!selectedEnrolmentId && !selectedModule}
          >
            Reset
          </FormButton>
        </div>
      </div>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-slate-500 ${bodyTextClassName}`}>
          Loading marksheet...
        </div>
      ) : null}

      {!isLoading && !selectedEnrolmentId ? (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
          Select a session enrolment to view your marksheet.
        </div>
      ) : null}

      {!isLoading && selectedEnrolmentId && marksheetRows.length === 0 ? (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
          No published unit marks found for the selected enrolment.
        </div>
      ) : null}

      {!isLoading && selectedEnrolmentId && marksheetRows.length > 0 ? (
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
                  <Th
                    key={column.key}
                    className={`text-center ${column.isAvg ? "!text-red-600" : ""}`}
                  >
                    {column.label}
                  </Th>
                ))}
              </tr>
            </Thead>
            <Tbody>
              {visibleRows.map((entry, index) => (
                <tr key={entry.unit.id}>
                  <Td className="w-10 text-center text-slate-400">
                    {(page - 1) * perPage + index + 1}
                  </Td>
                  <Td className="text-slate-700">{entry.unit.code}</Td>
                  <Td className="font-medium text-slate-800">{entry.unit.name}</Td>
                  {COLUMN_TYPES.map((column) => (
                    <Td
                      key={column.key}
                      className={`text-center ${column.isAvg ? "font-semibold !text-red-600" : "text-slate-700"}`}
                    >
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

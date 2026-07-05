import { useEffect, useMemo, useState } from "react";

import logo from "@/assets/logo.PNG";
import {
  bodyTextClassName,
  labelTextClassName,
  selectClassName,
} from "@/lib/styles";
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

const SYMBOL_LEGEND = [
  { symbol: "*", name: "Retake" },
  { symbol: "**", name: "Supplementary" },
  { symbol: "-", name: "Missing Marks" },
  { symbol: "AU", name: "Audited Unit" },
  { symbol: "CT", name: "Credit Transfer" },
  { symbol: "I", name: "Incomplete" },
  { symbol: "K", name: "Course In Progress" },
  { symbol: "NA", name: "Mark Type Not Applicable" },
  { symbol: "P", name: "Pass" },
];

function formatMark(value) {
  return value === null || value === undefined ? "-" : value;
}

function valueOrDash(value) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function tabClassName(active) {
  return active
    ? "bg-emerald-600 text-white shadow-[0_4px_10px_rgba(5,150,105,0.15)]"
    : "bg-white text-slate-600";
}

export function MyResultsPage() {
  const marksApi = useMarksApi();

  const [activeTab, setActiveTab] = useState("marksheet");
  const [enrolments, setEnrolments] = useState([]);
  const [selectedEnrolmentId, setSelectedEnrolmentId] = useState("");
  const [selectedModule, setSelectedModule] = useState("");
  const [transcriptType, setTranscriptType] = useState("progress");
  const [marksheetData, setMarksheetData] = useState(null);
  const [transcriptData, setTranscriptData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEnrolments, setIsLoadingEnrolments] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [isDownloadingTranscript, setIsDownloadingTranscript] = useState(false);

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
        if (mounted) {
          setIsLoadingEnrolments(false);
        }
      }
    }

    loadEnrolments();
    return () => {
      mounted = false;
    };
  }, [marksApi, selectedEnrolmentId]);

  const selectedEnrolment = useMemo(
    () => enrolments.find((e) => e.id === selectedEnrolmentId) ?? null,
    [enrolments, selectedEnrolmentId],
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!selectedEnrolmentId) return;

      setIsLoading(true);
      setError("");

      try {
        const params = { session_enrolment_id: selectedEnrolmentId };
        if (selectedModule && transcriptType !== "cumulative") {
          params.module = Number(selectedModule);
        }

        if (activeTab === "marksheet") {
          const res = await marksApi.myMarksheet(params);
          if (mounted) {
            setMarksheetData(res.data ?? null);
          }
        } else {
          params.transcript_type = transcriptType;
          const res = await marksApi.myTranscript(params);
          if (mounted) {
            setTranscriptData(res.data ?? null);
          }
        }
      } catch (e) {
        if (mounted) {
          setError(
            getApiErrorMessage(
              e,
              activeTab === "marksheet"
                ? "Failed to load marksheet."
                : "Failed to load transcript.",
            ),
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [activeTab, marksApi, selectedEnrolmentId, selectedModule, transcriptType]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, selectedEnrolmentId, selectedModule, transcriptType]);

  useEffect(() => {
    setSelectedModule("");
  }, [activeTab, selectedEnrolmentId]);

  const marksheetRows = marksheetData?.marksheet ?? [];
  const visibleMarksheetRows = marksheetRows.slice(
    (page - 1) * perPage,
    page * perPage,
  );
  const transcriptRows = transcriptData?.transcript ?? [];
  const visibleTranscriptRows = transcriptRows.slice(
    (page - 1) * perPage,
    page * perPage,
  );
  const student =
    activeTab === "marksheet"
      ? marksheetData?.student
      : transcriptData?.student;
  const transcriptCourse = transcriptData?.course;
  const transcriptMeta = transcriptData?.student_meta ?? {};
  const institution = transcriptData?.institution || {
    name: transcriptData?.institution_name,
  };
  const gradeLegend = transcriptData?.grade_legend ?? [];
  const transcriptLastPage = Math.max(
    1,
    Math.ceil(transcriptRows.length / perPage),
  );
  const generatedOn = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const transcriptReference = [
    "TR",
    (student?.admission_number || "NA").replace(/[^A-Za-z0-9]/g, ""),
    selectedEnrolmentId ? selectedEnrolmentId.slice(0, 8) : "NA",
    String(page).padStart(2, "0"),
  ].join("-");

  async function downloadTranscript() {
    if (!selectedEnrolmentId) {
      setError("Select a session before downloading the transcript.");
      return;
    }

    setIsDownloadingTranscript(true);
    setError("");

    try {
      const params = {
        session_enrolment_id: selectedEnrolmentId,
        transcript_type: transcriptType,
      };

      const response = await marksApi.myTranscriptDownload(params);
      const blob = response.data;
      const contentDisposition = response.headers?.["content-disposition"] ?? "";
      const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      const asciiMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
      const filename = utfMatch
        ? decodeURIComponent(utfMatch[1])
        : (asciiMatch?.[1] ?? `transcript.pdf`);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(getApiErrorMessage(downloadError, "Failed to download transcript."));
    } finally {
      setIsDownloadingTranscript(false);
    }
  }

  function getCellValue(entry, key) {
    if (key === "AVG(CAT)") {
      return formatMark(entry.averages?.CAT);
    }
    if (key === "AVG(PRAC)") {
      return formatMark(entry.averages?.PRAC);
    }

    return formatMark(entry.scores?.[key]);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
            View Marks
          </h1>
          <p className="text-[13px] text-slate-500">
            {activeTab === "marksheet"
              ? "Browse your published marksheet by session enrolment"
              : "Browse your published transcript and final unit grades"}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3">
          {activeTab === "transcript" ? (
            <FormButton
              type="button"
              variant="secondary"
              onClick={downloadTranscript}
              disabled={!selectedEnrolmentId || transcriptRows.length === 0 || isDownloadingTranscript}
            >
              {isDownloadingTranscript ? "Downloading..." : "Download Transcript"}
            </FormButton>
          ) : null}

          <div className="inline-flex w-fit items-center rounded-xl border border-slate-200 bg-white p-1 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <button
            type="button"
            onClick={() => setActiveTab("marksheet")}
            className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition ${tabClassName(activeTab === "marksheet")}`}
          >
            Marksheet
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("transcript")}
            className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition ${tabClassName(activeTab === "transcript")}`}
          >
            Transcript
          </button>
        </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,200px)_minmax(0,200px)_1fr_auto] lg:items-end">
          <div>
            <label
              className={`mb-2 block text-slate-600 ${labelTextClassName}`}
            >
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
            <label
              className={`mb-2 block text-slate-600 ${labelTextClassName}`}
            >
              Module
            </label>
            <select
              value={selectedModule}
              onChange={(event) => setSelectedModule(event.target.value)}
              className={`${selectClassName} w-full`}
              disabled={!selectedEnrolmentId || activeTab === "transcript"}
            >
              <option value="">All modules</option>
              {selectedEnrolment?.module ? (
                <option value={selectedEnrolment.module}>
                  Module {selectedEnrolment.module}
                </option>
              ) : null}
            </select>
          </div>

          {activeTab === "transcript" ? (
            <div>
              <label
                className={`mb-2 block text-slate-600 ${labelTextClassName}`}
              >
                Transcript Type
              </label>
              <select
                value={transcriptType}
                onChange={(event) => setTranscriptType(event.target.value)}
                className={`${selectClassName} w-full`}
              >
                <option value="progress">Progress (current session only)</option>
                <option value="cumulative">Cumulative (up to this session)</option>
              </select>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-[13px] text-slate-600">
            <div className="font-semibold text-slate-900">
              {student?.name ?? "Student"}
            </div>
            <div className="mt-1 text-slate-500">
              {student?.admission_number ?? ""}
            </div>
            {activeTab === "transcript" ? (
              <div className="mt-1 text-slate-500">
                {[
                  transcriptCourse?.name,
                  transcriptCourse?.code,
                  transcriptCourse?.certification_level,
                ]
                  .filter(Boolean)
                  .join(" | ")}
              </div>
            ) : null}
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
        <div
          className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}
        >
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div
          className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-slate-500 ${bodyTextClassName}`}
        >
          Loading {activeTab}...
        </div>
      ) : null}

      {!isLoading && !selectedEnrolmentId ? (
        <div
          className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}
        >
          Select a session enrolment to view your {activeTab}.
        </div>
      ) : null}

      {!isLoading &&
      activeTab === "marksheet" &&
      selectedEnrolmentId &&
      marksheetRows.length === 0 ? (
        <div
          className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}
        >
          No published unit marks found for the selected enrolment.
        </div>
      ) : null}

      {!isLoading &&
      activeTab === "marksheet" &&
      selectedEnrolmentId &&
      marksheetRows.length > 0 ? (
        <Table>
          <TableHeader>
            <div>
              <h2 className="text-[15px] font-semibold text-slate-900">
                Marksheet
              </h2>
              <p className="text-[12px] text-slate-500">
                {selectedEnrolment?.label}
              </p>
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
              {visibleMarksheetRows.map((entry, index) => (
                <tr key={entry.unit.id}>
                  <Td className="w-10 text-center text-slate-400">
                    {(page - 1) * perPage + index + 1}
                  </Td>
                  <Td className="text-slate-700">{entry.unit.code}</Td>
                  <Td className="font-medium text-slate-800">
                    {entry.unit.name}
                  </Td>
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

      {!isLoading &&
      activeTab === "transcript" &&
      selectedEnrolmentId &&
      transcriptRows.length === 0 ? (
        <div
          className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}
        >
          No published transcript records found for the selected filters.
        </div>
      ) : null}

      {!isLoading &&
      activeTab === "transcript" &&
      selectedEnrolmentId &&
      transcriptRows.length > 0 ? (
        <div className="space-y-4">
          <div className="mx-auto max-w-[210mm] overflow-hidden rounded-sm border border-slate-300 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <article
              className="flex min-h-[297mm] flex-col px-[12mm] py-[10mm] text-black"
            >
              <header className="text-center">
                <img
                  src={logo}
                  alt="Institution logo"
                  className="mx-auto h-10 object-contain"
                />

                {institution?.postal_address ? (
                  <p className="mt-0.5 text-[10px] text-slate-700">{institution.postal_address}</p>
                ) : null}
                {institution?.telephone ? (
                  <p className="text-[10px] text-slate-700">TEL: {institution.telephone}</p>
                ) : null}
                {institution?.email || institution?.website ? (
                  <p className="text-[10px] text-slate-700">
                    {institution?.email ? `Email: ${institution.email}` : ""}
                    {institution?.email && institution?.website ? " | " : ""}
                    {institution?.website ? `Web: ${institution.website}` : ""}
                  </p>
                ) : null}
                <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
                  Office of the Registrar - Academics
                </p>
                <p className="mt-1 text-[16px] font-bold tracking-[0.02em] text-black">
                  {transcriptType === "cumulative" ? "Cumulative Transcript" : "Progress Transcript"}
                </p>
              </header>

              <div className="mt-3 border-t border-black" />

              <div className="mt-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-black">
                  Student Information
                </p>
                <table className="w-full border-collapse border border-slate-400 text-[11px] leading-[1.45]">
                  <colgroup>
                    <col className="w-[120px]" />
                    <col />
                    <col className="w-[130px]" />
                    <col />
                  </colgroup>
                  <tbody>
                    <tr className="border-b border-slate-400">
                      <td className="px-1.5 py-1.5 font-bold text-slate-700">Name:</td>
                      <td className="px-2 py-1.5 text-black">{valueOrDash(student?.name)}</td>
                      <td className="border-l border-slate-300 px-2 py-1.5 font-bold text-slate-700">Reg No:</td>
                      <td className="px-2 py-1.5 text-black">{valueOrDash(student?.admission_number)}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="px-1.5 py-1.5 font-bold text-slate-700">School:</td>
                      <td className="px-2 py-1.5 text-black">{valueOrDash(
                        transcriptCourse?.school ||
                          transcriptCourse?.department ||
                          transcriptCourse?.certification_authority,
                      )}</td>
                      <td className="border-l border-slate-300 px-2 py-1.5 font-bold text-slate-700">Program:</td>
                      <td className="px-2 py-1.5 text-black">{valueOrDash(transcriptCourse?.name)}</td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="px-1.5 py-1.5 font-bold text-slate-700">Class:</td>
                      <td className="px-2 py-1.5 text-black">{valueOrDash(
                        transcriptMeta?.class_name ||
                          (transcriptMeta?.session_number
                            ? `Session ${transcriptMeta.session_number}`
                            : ""),
                      )}</td>
                      <td className="border-l border-slate-300 px-2 py-1.5 font-bold text-slate-700">Admission Year:</td>
                      <td className="px-2 py-1.5 text-black">{valueOrDash(transcriptMeta?.admission_year)}</td>
                    </tr>
                    <tr>
                      <td className="px-1.5 py-1.5 font-bold text-slate-700">Year of Study:</td>
                      <td className="px-2 py-1.5 text-black">{valueOrDash(
                        transcriptMeta?.year_of_study_label ||
                          (selectedEnrolment ? `YEAR ${selectedEnrolment.year_of_study}` : ""),
                      )}</td>
                      <td className="border-l border-slate-300 px-2 py-1.5" />
                      <td className="px-2 py-1.5" />
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-6">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-black">
                  Academic Record
                </p>
                <p className="mb-1 text-[9px] text-slate-500 italic">
                  {transcriptType === "cumulative" ? "All units up to and including the selected session" : "Units for the selected session"}
                </p>
                <div className="overflow-hidden border border-black bg-white">
                  <table className="w-full border-collapse text-[11px] leading-[1.25]">
                    <thead>
                      <tr>
                        <th className="w-[18%] border border-black px-2 py-1.5 text-left font-bold">
                          Unit Code
                        </th>
                        <th className="w-[55%] border border-black px-2 py-1.5 text-left font-bold">
                          Unit Name
                        </th>
                        <th className="w-[9%] border border-black px-2 py-1.5 text-right font-bold">
                          Hours
                        </th>
                        <th className="w-[9%] border border-black px-2 py-1.5 text-right font-bold">
                          Score
                        </th>
                        <th className="w-[9%] border border-black px-2 py-1.5 text-right font-bold">
                          Grade
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleTranscriptRows.map((entry) => (
                        <tr key={entry.unit.id}>
                          <td className="border border-slate-500 px-2 py-1.5 align-top">
                            {valueOrDash(entry.unit.code)}
                          </td>
                          <td className="border border-slate-500 px-2 py-1.5 align-top">
                            {valueOrDash(entry.unit.name)}
                          </td>
                          <td className="border border-slate-500 px-2 py-1.5 text-right align-top">
                            {valueOrDash(entry.unit.taught_hours)}
                          </td>
                          <td className="border border-slate-500 px-2 py-1.5 text-right align-top">
                            {valueOrDash(entry.marks)}
                          </td>
                          <td className="border border-slate-500 px-2 py-1.5 text-right align-top">
                            {valueOrDash(entry.grade)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-auto pt-8">
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="self-end">
                    <div className="mb-2 grid grid-cols-[72px_1fr] text-[11px] font-bold">
                      <span>Grade</span>
                      <span>Points</span>
                    </div>
                    <div className="space-y-1 text-[11px] leading-[1.25]">
                      {gradeLegend.length > 0 ? (
                        gradeLegend.map((entry) => (
                          <div
                            key={`${entry.grade}-${entry.points}`}
                            className="grid grid-cols-[72px_1fr]"
                          >
                            <span className="font-bold">{valueOrDash(entry.grade)}</span>
                            <span>{valueOrDash(entry.points)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-600">No grade bands configured.</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-10 grid gap-3 text-[10px] leading-[1.35] text-slate-800">
                  <div className="flex items-end gap-3">
                    <span>Registrar Academics</span>
                    <span className="min-w-[120px] flex-1 border-b border-slate-700" />
                    <span>Date Generated</span>
                    <span className="min-w-[110px] border-b border-slate-700 px-1 text-center">{generatedOn}</span>
                  </div>
                  <p>This is a provisional and unofficial transcript issued for reference only.</p>
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.08em] text-slate-700">
                    <span>Document Ref: {transcriptReference}</span>
                    <span>Page: {page} of {transcriptLastPage}</span>
                  </div>
                </div>

                <footer className="mt-5 border-t border-slate-700 pt-2 text-[10px] text-slate-800">
                  This result slip is issued without any erasures or alterations. Not valid without official stamp.
                </footer>
              </div>
            </article>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white">
            <PaginationFooter
              page={page}
              perPage={perPage}
              total={transcriptRows.length}
              lastPage={transcriptLastPage}
              onPageChange={setPage}
              onPerPageChange={setPerPage}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import * as yup from "yup";

import { bodyTextClassName, inputClassName, labelClassName, selectClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { FormInput } from "@/components/FormInput";
import { LookupSelect } from "@/components/LookupSelect";
import { Modal, ModalBody, ModalFooter } from "@/components/Modal";
import { Table, TableWrapper, Thead, Th, Tbody, Td, TableFooter } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { useMarksApi } from "@/hooks/useMarksApi";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const ASSESSMENT_TYPES = ["CAT 1", "CAT 2", "CAT 3", "PRAC 1", "PRAC 2", "PRAC 3"];
const CAT_PREFIXES = ["CAT"];
const PRAC_PREFIXES = ["PRAC"];

const editSchema = yup.object({
  score: yup.number().typeError("Score must be a number").required("Score is required").min(0, "Minimum score is 0").max(100, "Maximum score is 100"),
});

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

function getGroupKey(type) {
  if (CAT_PREFIXES.some((p) => type.startsWith(p))) return "CAT";
  if (PRAC_PREFIXES.some((p) => type.startsWith(p))) return "PRAC";
  return null;
}

function extractTypeLabel(assessmentType) {
  return assessmentType?.split(" ")[0] ?? "";
}

function extractNumber(assessmentType) {
  return Number(assessmentType?.split(" ")[1] ?? 0);
}

export function ViewMarksPage() {
  const marksApi = useMarksApi();
  const sessionsApi = useAcademicSessionsApi();

  const [marks, setMarks] = useState([]);
  const [marksheetData, setMarksheetData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterSession, setFilterSession] = useState("");
  const [filterStudent, setFilterStudent] = useState("");
  const [filterStudentOption, setFilterStudentOption] = useState(null);
  const [filterUnit, setFilterUnit] = useState("");
  const [filterUnitOption, setFilterUnitOption] = useState(null);
  const [filterType, setFilterType] = useState("");

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [totalMarks, setTotalMarks] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  const [editMark, setEditMark] = useState(null);
  const editFormRef = useRef(null);
  const exportRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState("csv");
  const [showExportMenu, setShowExportMenu] = useState(false);

  const {
    register,
    handleSubmit,
    reset: resetEdit,
    setError: setEditError,
    formState: { errors: editErrors, isSubmitting: isEditing },
  } = useForm({
    resolver: yupResolver(editSchema),
  });

  const loadSessions = useCallback(async () => {
    try {
      const res = await sessionsApi.list({ per_page: 50, sort_direction: "desc" });
      setSessions(res.data ?? []);
    } catch {
      // silent
    }
  }, [sessionsApi]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (exportRef.current && !exportRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchStudents = useCallback(async (query) => {
    if (!filterSession) return [];
    const params = { q: query, academic_session_id: filterSession };
    const res = await marksApi.availableStudents(params);
    return (res.data ?? []).map((s) => ({
      id: s.id,
      label: `${s.admission_number} - ${s.name}`,
    }));
  }, [marksApi, filterSession]);

  const fetchUnits = useCallback(async (query) => {
    const params = { q: query };
    if (filterSession) params.academic_session_id = filterSession;
    const res = await marksApi.availableUnits(params);
    return (res.data ?? []).map((u) => ({
      id: u.id,
      label: `${u.code} - ${u.name}`,
    }));
  }, [marksApi, filterSession]);

  const loadData = useCallback(async () => {
    if (!filterStudent && (!filterSession || !filterUnit)) {
      setMarks([]);
      setMarksheetData(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (filterUnit) {
        if (!filterType) {
          const params = { academic_session_id: filterSession, unit_id: filterUnit };
          if (filterStudent) params.student_id = filterStudent;
          const res = await marksApi.marksheet(params);
          setMarksheetData(res.data ?? null);
          setMarks([]);
        } else {
          const params = { academic_session_id: filterSession, unit_id: filterUnit, assessment_type: filterType, page, per_page: perPage };
          if (filterStudent) params.student_id = filterStudent;
          const res = await marksApi.list(params);
          setMarks(res.data ?? []);
          setTotalMarks(res.total ?? 0);
          setLastPage(res.last_page ?? 1);
          setMarksheetData(null);
        }
      } else {
        const params = { page, per_page: perPage };
        if (filterSession) params.academic_session_id = filterSession;
        if (filterStudent) params.student_id = filterStudent;
        if (filterType) params.assessment_type = filterType;
        const res = await marksApi.list(params);
        setMarks(res.data ?? []);
        setTotalMarks(res.total ?? 0);
        setLastPage(res.last_page ?? 1);
        setMarksheetData(null);
      }
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load marks."));
    } finally {
      setIsLoading(false);
    }
  }, [marksApi, filterSession, filterUnit, filterType, filterStudent, page, perPage]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function getMarksForStudent(studentId, typeKey) {
    if (!marksheetData?.marksheet) return null;
    const student = marksheetData.marksheet.find((s) => s.student.id === studentId);
    if (!student) return null;

    if (typeKey.startsWith("AVG")) {
      const group = typeKey === "AVG(CAT)" ? "CAT" : "PRAC";
      const typeMarks = Object.entries(student.types).filter(([key]) => getGroupKey(key) === group);
      let total = 0;
      let count = 0;
      typeMarks.forEach(([, typeData]) => {
        total += typeData.total;
        count += typeData.count;
      });
      return count > 0 ? (total / count).toFixed(1) : "-";
    }

    const [assType, assNum] = typeKey.split(" ");
    const typeData = student.types[assType];
    if (!typeData) return "-";
    const mark = typeData.marks[`${assType}_${assNum}`];
    return mark ? mark.score ?? mark.marks : "-";
  }

  function getMarkIdForStudent(studentId, typeKey) {
    if (!marksheetData?.marksheet) return null;
    const student = marksheetData.marksheet.find((s) => s.student.id === studentId);
    if (!student) return null;
    const [assType, assNum] = typeKey.split(" ");
    const typeData = student.types[assType];
    if (!typeData) return null;
    const mark = typeData.marks[`${assType}_${assNum}`];
    return mark?.id ?? null;
  }

  function isAvgColumn(typeKey) {
    return typeKey.startsWith("AVG");
  }

  function openEditModal(mark) {
    setEditMark(mark);
    resetEdit({ score: mark.score ?? mark.marks ?? "" });
  }

  function closeEditModal() {
    setEditMark(null);
    resetEdit({ score: "" });
  }

  async function onSubmitEdit(data) {
    if (!editMark) return;

    try {
      await marksApi.update(editMark.id, { score: Number(data.score) });
      toast.success("Score updated.");
      await loadData();
    } catch (e) {
      const serverErrors = e?.response?.data?.errors;
      if (serverErrors) {
        Object.entries(serverErrors).forEach(([key, value]) => {
          setEditError(key, { message: value?.[0] ?? "Invalid value" });
        });
      } else {
        setEditError("root", { message: getApiErrorMessage(e, "Failed to update score.") });
      }
    }
  }

  async function handleExport(format) {
    if (!filterSession || !filterUnit) {
      toast.error("Select an academic session and unit before exporting.");
      return;
    }

    setExporting(true);
    setShowExportMenu(false);
    setExportFormat(format);

    try {
      const params = {
        format,
        academic_session_id: filterSession,
        unit_id: filterUnit,
      };

      if (filterStudent) params.student_id = filterStudent;
      if (filterType) params.assessment_type = filterType;

      const response = await marksApi.exportMarks(params);
      const disposition = response.headers?.["content-disposition"] ?? "";
      const encodedMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const regularMatch = disposition.match(/filename="?([^";]+)"?/i);
      const filename = encodedMatch
        ? decodeURIComponent(encodedMatch[1])
        : regularMatch?.[1] ?? `marks.${format}`;
      const url = URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success(`Marks exported as ${format.toUpperCase()}.`);
    } catch (exportError) {
      toast.error(getApiErrorMessage(exportError, "Failed to export marks."));
    } finally {
      setExporting(false);
    }
  }

  const exportLabels = { csv: "CSV", xlsx: "Excel", pdf: "PDF" };
  const canExport = Boolean(filterSession && filterUnit);

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">View Marks</h1>
          <p className="text-[13px] text-slate-500">Browse recorded student marks</p>
        </div>

        <div className="relative" ref={exportRef}>
          <div className="flex">
            <FormButton
              type="button"
              variant="secondary"
              disabled={exporting || !canExport}
              onClick={() => handleExport(exportFormat)}
              className="rounded-r-none border-r-0 sm:px-4"
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting ? "Exporting..." : `Export ${exportLabels[exportFormat]}`}
            </FormButton>
            <FormButton
              type="button"
              variant="secondary"
              disabled={exporting || !canExport}
              onClick={() => setShowExportMenu((current) => !current)}
              aria-label="Choose export format"
              aria-expanded={showExportMenu}
              className="rounded-l-none border-l border-slate-200 px-2 sm:px-2"
              style={{ minWidth: 0 }}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
            </FormButton>
          </div>

          {showExportMenu && (
            <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-[0_12px_30px_rgba(15,23,42,0.12)]">
              {[
                { value: "csv", label: "CSV (.csv)" },
                { value: "xlsx", label: "Excel (.xlsx)" },
                { value: "pdf", label: "PDF (.pdf)" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={exporting}
                  onClick={() => handleExport(option.value)}
                  className={`flex w-full px-4 py-2.5 text-left text-[14px] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 ${
                    exportFormat === option.value
                      ? "bg-emerald-50 font-medium text-emerald-700"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <LookupSelect
              label="Student (optional)"
              value={filterStudent}
              selectedOption={filterStudentOption}
              onChange={(nextValue, option) => {
                setFilterStudent(nextValue);
                setFilterStudentOption(option);
                setPage(1);
              }}
              fetchOptions={fetchStudents}
              placeholder={filterSession ? "Search student" : "Select session first"}
              emptyMessage="No students found"
              disabled={!filterSession}
              clearable
            />
          </div>
          <div>
            <label htmlFor="filterSession" className={`mb-2 block text-slate-600 ${labelClassName}`}>Academic Session</label>
            <select
              id="filterSession"
              value={filterSession}
              onChange={(e) => { setFilterSession(e.target.value); setFilterStudent(""); setFilterStudentOption(null); setFilterUnit(""); setFilterUnitOption(null); setFilterType(""); setPage(1); }}
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
                setPage(1);
              }}
              fetchOptions={fetchUnits}
              placeholder={filterSession ? "Search unit" : "Select session first"}
              emptyMessage="No units found"
              disabled={!filterSession}
            />
          </div>
          <div>
            <label htmlFor="filterType" className={`mb-2 block text-slate-600 ${labelClassName}`}>Assessment Type</label>
            <select
              id="filterType"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
              className={`${selectClassName} w-full`}
              disabled={!filterUnit}
            >
              <option value="">All Types</option>
              {ASSESSMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      {/* All Types view */}
      {!filterType && marksheetData?.marksheet?.length > 0 ? (
        <Table>
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <Th>Admission</Th>
                <Th>Student</Th>
                {COLUMN_TYPES.map((col) => (
                  <Th key={col.key} className={`text-center ${col.isAvg ? "!text-red-600 " : ""}`}>{col.label}</Th>
                ))}
              </tr>
              
            </Thead>
            <Tbody>
              {marksheetData.marksheet.slice((page - 1) * perPage, page * perPage).map((student, index) => (
                <tr key={student.student.id}>
                  <Td className="w-10 text-center text-slate-400">{(page - 1) * perPage + index + 1}</Td>
                  <Td className="text-slate-700">{student.student.admission_number}</Td>
                  <Td className="font-medium text-slate-800">{student.student.name}</Td>
                  {COLUMN_TYPES.map((col) => {
                    const value = getMarksForStudent(student.student.id, col.key);
                    const markId = getMarkIdForStudent(student.student.id, col.key);
                    return (
                      <Td key={col.key} className={`text-center ${col.isAvg ? "font-semibold !text-red-600" : "text-slate-700"}`}>
                        {value !== "-" && value !== null ? value : "-"}
                      </Td>
                    );
                  })}
                </tr>
              ))}
            </Tbody>
          </TableWrapper>
          <TableFooter>
            <PaginationFooter
              page={page}
              perPage={perPage}
              total={marksheetData.marksheet.length}
              lastPage={Math.ceil(marksheetData.marksheet.length / perPage)}
              onPageChange={setPage}
              onPerPageChange={setPerPage}
            />
          </TableFooter>
        </Table>
      ) : null}

      {/* All Types empty state */}
      {!filterType && !isLoading && marksheetData && marksheetData.marksheet?.length === 0 ? (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
          No marks found for the selected session and unit.
        </div>
      ) : null}

      {/* Marks list view (student-only or with type filter) */}
      {marks.length > 0 ? (
        <Table>
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <Th>Admission</Th>
                <Th>Student</Th>
                {!filterUnit ? <Th>Unit</Th> : null}
                <Th>Assessment</Th>
                <Th className="text-center">Score</Th>
                <Th className="text-center">Status</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </Thead>
            <Tbody>
              {marks.length === 0 && !isLoading ? (
                <tr>
                  <Td colSpan={filterUnit ? 7 : 8} className={`py-10 text-center text-slate-500 ${bodyTextClassName}`}>No marks found.</Td>
                </tr>
              ) : (
                marks.map((mark, index) => (
                  <tr key={mark.id}>
                    <Td className="w-10 text-center text-slate-400">{(page - 1) * perPage + index + 1}</Td>
                    <Td className="text-slate-700">{mark.student?.admission_number ?? "—"}</Td>
                    <Td className="font-medium text-slate-800">
                      {mark.student ? [mark.student.first_name, mark.student.middle_name, mark.student.last_name].filter(Boolean).join(" ") : "—"}
                    </Td>
                    {!filterUnit ? <Td className="text-slate-600">{mark.unit?.code ?? "—"}</Td> : null}
                    <Td className="text-slate-700">{mark.assessment_type} {mark.assessment_number}</Td>
                    <Td className="text-center font-semibold">{mark.score ?? mark.marks}</Td>
                    <Td className="text-center">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${mark.is_published ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {mark.is_published ? "Published" : "Draft"}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <button type="button" onClick={() => openEditModal(mark)} className="inline-flex h-7 items-center gap-1 rounded-lg border border-emerald-200 px-2.5 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-50">
                        Edit
                      </button>
                    </Td>
                  </tr>
                ))
              )}
            </Tbody>
          </TableWrapper>
          {totalMarks > 0 ? (
            <TableFooter>
              <PaginationFooter
                page={page}
                perPage={perPage}
                total={totalMarks}
                lastPage={lastPage}
                onPageChange={setPage}
                onPerPageChange={setPerPage}
              />
            </TableFooter>
          ) : null}
        </Table>
      ) : null}

      {/* Loading state */}
      {isLoading ? (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
          Loading marks...
        </div>
      ) : null}

      {/* Initial state (no filters) */}
      {!isLoading && !filterSession && !filterUnit && !filterStudent && !error ? (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
          Select a session and unit to view marks.
        </div>
      ) : null}

      {/* Empty state when student selected but no marks found */}
      {!isLoading && filterStudent && !marksheetData && marks.length === 0 && !error ? (
        <div className={`rounded-xl border border-slate-200/80 bg-white px-5 py-10 text-center text-slate-500 ${bodyTextClassName}`}>
          No marks found for the selected criteria.
        </div>
      ) : null}

      {/* Edit Modal */}
      <Modal
        open={Boolean(editMark)}
        onClose={closeEditModal}
        title="Edit Mark"
        description={editMark ? `Updating score for ${editMark.student?.admission_number ?? ""}` : ""}
        size="sm"
        initialFocusRef={editFormRef}
      >
        {editErrors.root ? (
          <div className={`mx-5 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{editErrors.root.message}</div>
        ) : null}
        <form onSubmit={handleSubmit(onSubmitEdit)}>
          <ModalBody>
            <FormInput
              id="edit-score"
              label="Score"
              type="number"
              min={0}
              max={100}
              placeholder="e.g. 75"
              required
              error={editErrors.score?.message}
              {...register("score")}
            />
          </ModalBody>
          <ModalFooter>
            <FormButton type="button" variant="secondary" onClick={closeEditModal}>Cancel</FormButton>
            <FormButton type="submit" disabled={isEditing}>
              {isEditing ? "Saving..." : "Update Score"}
            </FormButton>
          </ModalFooter>
        </form>
      </Modal>
    </section>
  );
}

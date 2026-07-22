import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, XCircle } from "lucide-react";

import { bodyTextClassName, labelClassName, selectClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { LookupSelect } from "@/components/LookupSelect";
import { Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td, TableFooter } from "@/components/DataTable";
import { PaginationFooter } from "@/components/PaginationFooter";
import { useMarksApi } from "@/hooks/useMarksApi";
import { useExamSeriesApi } from "@/hooks/useExamSeriesApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const FALLBACK_TYPES = [
  "CAT 1", "CAT 2", "CAT 3", "PRAC 1", "PRAC 2", "PRAC 3",
];

export function PublishMarksPage() {
  const marksApi = useMarksApi();
  const examSeriesApi = useExamSeriesApi();

  const [marks, setMarks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [publishingId, setPublishingId] = useState(null);
  const [examSeriesOptions, setExamSeriesOptions] = useState([]);

  const [filterExamSeries, setFilterExamSeries] = useState("");
  const [filterExamSeriesOption, setFilterExamSeriesOption] = useState(null);
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

  useEffect(() => {
    examSeriesApi.options().then((res) => setExamSeriesOptions(res.data ?? [])).catch(() => {});
  }, [examSeriesApi]);

  const selectedExamSeriesTypes = useMemo(() => {
    if (!filterExamSeries) return null;
    const found = examSeriesOptions.find((s) => s.id === filterExamSeries);
    return found?.assessment_types ?? null;
  }, [filterExamSeries, examSeriesOptions]);

  const currentTypes = selectedExamSeriesTypes || FALLBACK_TYPES;

  const fetchExamSeries = useCallback(async (query) => {
    const q = (query ?? "").toLowerCase();
    return examSeriesOptions
      .filter((s) => !q || s.name.toLowerCase().includes(q) || (s.short_name ?? "").toLowerCase().includes(q))
      .map((s) => ({ id: s.id, label: `${s.name}${s.short_name ? ` (${s.short_name})` : ""}` }));
  }, [examSeriesOptions]);

  const fetchStudents = useCallback(async (query) => {
    if (!filterExamSeries) return [];
    const params = { q: query, exam_series_id: filterExamSeries };
    const res = await marksApi.availableStudents(params);
    return (res.data ?? []).map((s) => ({
      id: s.id,
      label: `${s.admission_number} - ${s.name}`,
    }));
  }, [marksApi, filterExamSeries]);

  const fetchUnits = useCallback(async (query) => {
    if (!filterExamSeries) return [];
    const params = { q: query, exam_series_id: filterExamSeries };
    const res = await marksApi.availableUnits(params);
    return (res.data ?? []).map((u) => ({
      id: u.id,
      label: `${u.code} - ${u.name}`,
    }));
  }, [marksApi, filterExamSeries]);

  async function loadMarks() {
    setIsLoading(true);
    setError("");
    try {
      const params = { page, per_page: perPage };
      if (filterExamSeries) params.exam_series_id = filterExamSeries;
      if (filterSession) params.academic_session_id = filterSession;
      if (filterStudent) params.student_id = filterStudent;
      if (filterUnit) params.unit_id = filterUnit;
      if (filterType) params.assessment_type = filterType;
      const res = await marksApi.list(params);
      setMarks(res.data ?? []);
      setTotalMarks(res.total ?? 0);
      setLastPage(res.last_page ?? 1);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load marks."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadMarks(); }, [filterExamSeries, filterSession, filterStudent, filterUnit, filterType, page, perPage]);

  async function handleTogglePublish(markId) {
    setPublishingId(markId);
    try {
      const res = await marksApi.togglePublish(markId);
      toast.success(res.message ?? "Toggled.");
      await loadMarks();
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Failed to toggle."));
    } finally {
      setPublishingId(null);
    }
  }

  async function handlePublishFiltered(publish) {
    const label = publish ? "publish" : "unpublish";
    let filterDesc = "all marks";
    if (filterType) filterDesc = filterType;
    if (filterStudent && filterStudentOption) filterDesc += ` for ${filterStudentOption.label}`;

    const confirmed = window.confirm(`${publish ? "Publish" : "Unpublish"} ${filterDesc}?`);
    if (!confirmed) return;

    try {
      const payload = { publish };
      if (filterExamSeries) payload.exam_series_id = filterExamSeries;
      if (filterSession) payload.academic_session_id = filterSession;
      if (filterStudent) payload.student_id = filterStudent;
      if (filterUnit) payload.unit_id = filterUnit;
      if (filterType) payload.assessment_type = filterType;

      const res = await marksApi.publishFiltered(payload);
      toast.success(res.message ?? `All matching marks ${label}ed.`);
      await loadMarks();
    } catch (e) {
      toast.error(getApiErrorMessage(e, `Failed to ${label} marks.`));
    }
  }

  async function handleBulkPublish(publish) {
    if (!filterExamSeries || !filterUnit || !filterType) {
      toast.error("Please select exam series, unit, and assessment type first.");
      return;
    }

    const label = publish ? "publish" : "unpublish";
    const confirmed = window.confirm(
      `${publish ? "Publish" : "Unpublish"} all scores for ${filterType}?`,
    );
    if (!confirmed) return;

    try {
      await marksApi.publishAssessment({
        unit_id: filterUnit,
        assessment_type: filterType,
        academic_session_id: filterSession,
        exam_series_id: filterExamSeries || undefined,
        publish,
      });
    } catch (e) {
      toast.error(`Failed to ${label} ${filterType}`);
    }
    toast.success(`All scores ${label}ed.`);
    await loadMarks();
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Publish Marks</h1>
        <p className="text-[13px] text-slate-500">Review and publish/unpublish student marks</p>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <LookupSelect
              label="Exam Series"
              value={filterExamSeries}
              selectedOption={filterExamSeriesOption}
              onChange={(nextValue, option) => {
                setFilterExamSeries(nextValue);
                setFilterExamSeriesOption(option);
                const found = examSeriesOptions.find((s) => s.id === nextValue);
                setFilterSession(found?.academic_session_id ?? "");
                setFilterStudent("");
                setFilterStudentOption(null);
                setFilterUnit("");
                setFilterUnitOption(null);
                setFilterType("");
              }}
              fetchOptions={fetchExamSeries}
              placeholder="Search exam series"
              emptyMessage="No exam series found"
              clearable
            />
          </div>
          <div>
            <LookupSelect
              label="Student (optional)"
              value={filterStudent}
              selectedOption={filterStudentOption}
              onChange={(nextValue, option) => {
                setFilterStudent(nextValue);
                setFilterStudentOption(option);
              }}
              fetchOptions={fetchStudents}
              placeholder={filterExamSeries ? "Search student" : "Select exam series first"}
              emptyMessage="No students found"
              disabled={!filterExamSeries}
              clearable
            />
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
              placeholder={filterExamSeries ? "Search unit" : "Select exam series first"}
              emptyMessage="No units found"
              disabled={!filterExamSeries}
            />
          </div>
          <div>
            <label htmlFor="filterType" className={`mb-2 block text-slate-600 ${labelClassName}`}>Assessment Type</label>
            <select
              id="filterType"
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); }}
              className={`${selectClassName} w-full`}
              disabled={!filterUnit}
            >
              <option value="">All Types</option>
              {currentTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        {filterExamSeries && filterUnit && filterType ? (
          <div className="mt-4 flex gap-2">
            <FormButton type="button" onClick={() => handleBulkPublish(true)}>
              Publish All for This Assessment
            </FormButton>
            <FormButton type="button" variant="secondary" onClick={() => handleBulkPublish(false)}>
              Unpublish All
            </FormButton>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      <Table>
        <TableHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-[1.0625rem] font-semibold text-slate-900">Marks for Review</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePublishFiltered(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm ring-1 ring-emerald-700/20 transition hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.97]"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Publish All Filtered
              </button>
              <button
                type="button"
                onClick={() => handlePublishFiltered(false)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm ring-1 ring-amber-700/20 transition hover:from-amber-600 hover:to-amber-700 active:scale-[0.97]"
              >
                <XCircle className="h-3.5 w-3.5" />
                Unpublish All Filtered
              </button>
              <FormButton type="button" variant="secondary" onClick={loadMarks}>
                Refresh
              </FormButton>
            </div>
          </div>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading marks...</div>
        ) : marks.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>
            No marks to review. Use the filters above to find marks.
          </div>
        ) : (
          <>
            <TableWrapper>
              <Thead>
                <tr>
                  <Th className="w-10 text-center">#</Th>
                  <Th>Student</Th>
                  <Th>Unit</Th>
                  <Th>Assessment</Th>
                  <Th className="text-center">Score</Th>
                  <Th className="text-center">Published</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </Thead>
              <Tbody>
                {marks.map((mark, index) => (
                  <tr key={mark.id}>
                    <Td className="w-10 text-center text-slate-400">{(page - 1) * perPage + index + 1}</Td>
                    <Td className="font-medium text-slate-800">
                      {mark.student
                        ? [mark.student.first_name, mark.student.middle_name, mark.student.last_name]
                            .filter(Boolean)
                            .join(" ")
                        : "—"}
                    </Td>
                    <Td>{mark.unit?.code ?? "—"}</Td>
                    <Td>{mark.assessment_type} {mark.assessment_number}</Td>
                    <Td className="text-center font-semibold">{mark.score ?? mark.marks}</Td>
                    <Td className="text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          mark.is_published
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {mark.is_published ? "Yes" : "No"}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(mark.id)}
                        disabled={publishingId === mark.id}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium transition disabled:opacity-50 ${
                          mark.is_published
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {mark.is_published ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                        {mark.is_published ? "Unpublish" : "Publish"}
                      </button>
                    </Td>
                  </tr>
                ))}
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
          </>
        )}
      </Table>
    </section>
  );
}

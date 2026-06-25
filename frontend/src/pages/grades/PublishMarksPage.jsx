import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, XCircle } from "lucide-react";

import { bodyTextClassName, labelTextClassName, selectClassName, inputClassName } from "@/lib/styles";
import { FormButton } from "@/components/FormButton";
import { Table, TableHeader, TableWrapper, Thead, Th, Tbody, Td } from "@/components/DataTable";
import { useMarksApi } from "@/hooks/useMarksApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const ASSESSMENT_TYPES = [
  "CAT 1", "CAT 2", "CAT 3", "PRAC 1", "PRAC 2", "PRAC 3",
];

export function PublishMarksPage() {
  const marksApi = useMarksApi();

  const [marks, setMarks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [publishingId, setPublishingId] = useState(null);
  const [filterSession, setFilterSession] = useState("");
  const [filterUnit, setFilterUnit] = useState("");
  const [filterType, setFilterType] = useState("");

  async function loadMarks() {
    setIsLoading(true);
    setError("");
    try {
      const params = { per_page: 200 };
      if (filterSession) params.academic_session_id = filterSession;
      if (filterUnit) params.unit_id = filterUnit;
      if (filterType) params.assessment_type = filterType;
      const res = await marksApi.list(params);
      setMarks(res.data ?? []);
    } catch (e) {
      setError(getApiErrorMessage(e, "Failed to load marks."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadMarks(); }, [filterSession, filterUnit, filterType]);

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

  async function handleBulkPublish(publish) {
    if (!filterSession || !filterUnit || !filterType) {
      toast.error("Please select session, unit, and assessment type first.");
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
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Academic Session ID</label>
            <input
              type="text"
              value={filterSession}
              onChange={(e) => setFilterSession(e.target.value)}
              className={`${inputClassName} w-full`}
              placeholder="e.g. session-id"
            />
          </div>
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Unit ID</label>
            <input
              type="text"
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className={`${inputClassName} w-full`}
              placeholder="e.g. unit-id"
            />
          </div>
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Assessment Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`${selectClassName} w-full`}
            >
              <option value="">All Types</option>
              {ASSESSMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
        {filterSession && filterUnit && filterType ? (
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
            <FormButton type="button" variant="secondary" onClick={loadMarks}>
              Refresh
            </FormButton>
          </div>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading marks...</div>
        ) : marks.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>
            No marks to review. Use the filters above to find marks.
          </div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th>Student</Th>
                <Th>Unit</Th>
                <Th>Assessment</Th>
                <Th className="text-center">Score</Th>
                <Th className="text-center">Published</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </Thead>
            <Tbody>
              {marks.map((mark) => (
                <tr key={mark.id}>
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
        )}
      </Table>
    </section>
  );
}

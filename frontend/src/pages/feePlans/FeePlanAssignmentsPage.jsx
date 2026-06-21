import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, BadgeCheck, Coins, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { FormButton } from "@/components/FormButton";
import { LookupSelect } from "@/components/LookupSelect";
import { useFeePlanCourseAssignmentsApi } from "@/hooks/useFeePlanCourseAssignmentsApi";
import { useLookupApi } from "@/hooks/useLookupApi";
import { bodyTextClassName } from "@/lib/styles";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function FeePlanAssignmentsPage() {
  const { planId } = useParams();
  const assignmentsApi = useFeePlanCourseAssignmentsApi();
  const lookupApi = useLookupApi();

  const [planName, setPlanName] = useState("");
  const [assignments, setAssignments] = useState([]);
  const [asLoading, setAsLoading] = useState(true);
  const [asSaving, setAsSaving] = useState(false);
  const [asDeletingId, setAsDeletingId] = useState(null);
  const [asCourseValue, setAsCourseValue] = useState("");
  const [asCourseOption, setAsCourseOption] = useState(null);
  const [asYear, setAsYear] = useState("1");
  const [asSession, setAsSession] = useState("1");
  const [asApproved, setAsApproved] = useState(false);

  const loadAssignments = useCallback(async () => {
    setAsLoading(true);
    try {
      const response = await assignmentsApi.list(planId);
      const items = response.data ?? [];
      setAssignments(items);
      if (items.length > 0) {
        setPlanName(items[0].fee_plan_name ?? "");
      }
    } catch {
      // silent
    } finally {
      setAsLoading(false);
    }
  }, [planId, assignmentsApi]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  async function handleAddAssignment() {
    if (!asCourseValue) return;
    setAsSaving(true);
    try {
      await assignmentsApi.create(planId, {
        course_id: asCourseValue,
        year_level: Number(asYear),
        session_number: Number(asSession),
        is_approved: asApproved,
      });
      toast.success("Course linked to fee plan.");
      setAsCourseValue("");
      setAsCourseOption(null);
      setAsApproved(false);
      await loadAssignments();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to link course."));
    } finally {
      setAsSaving(false);
    }
  }

  async function handleToggleApprove(item) {
    try {
      await assignmentsApi.update(planId, item.id, {
        is_approved: !item.is_approved,
      });
      toast.success(item.is_approved ? "Approval revoked." : "Fee plan approved for this course.");
      await loadAssignments();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update."));
    }
  }

  async function handleDeleteAssignment(item) {
    setAsDeletingId(item.id);
    try {
      await assignmentsApi.remove(planId, item.id);
      toast.success("Course unlinked.");
      await loadAssignments();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to unlink."));
    } finally {
      setAsDeletingId(null);
    }
  }

  async function fetchCourseOptions(query) {
    const response = await lookupApi.search("courses", { query, limit: 10 });
    return response.data ?? [];
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
            {planName ? `${planName} — ` : ""}Course Assignments
          </h1>
          <p className="text-[13px] text-slate-500">
            Link courses to this fee plan by year level and session.
          </p>
        </div>

        <Link
          to="/finance/fee-plans"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to fee plans
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <h2 className="mb-4 flex items-center gap-2 text-[1.0625rem] font-semibold text-slate-900">
          <Coins className="h-5 w-5 text-emerald-600" />
          Course Assignments by Year & Session
        </h2>

        {asLoading ? (
          <div className={`text-slate-500 ${bodyTextClassName}`}>Loading course assignments...</div>
        ) : (
          <div className="space-y-4">
            {assignments.length > 0 ? (
              <div className="overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-[13px]">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-4 py-2.5 font-medium text-slate-600">Course</th>
                      <th className="px-4 py-2.5 font-medium text-slate-600">Year</th>
                      <th className="px-4 py-2.5 font-medium text-slate-600">Session</th>
                      <th className="px-4 py-2.5 font-medium text-slate-600">Status</th>
                      <th className="px-4 py-2.5 text-right font-medium text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignments.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-700">{item.course_code} – {item.course_name}</td>
                        <td className="px-4 py-2.5 text-slate-700">Year {item.year_level}</td>
                        <td className="px-4 py-2.5 text-slate-700">Session {item.session_number}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              item.is_approved
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {item.is_approved ? <BadgeCheck className="h-3 w-3" /> : null}
                            {item.is_approved ? "Approved" : "Pending"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleApprove(item)}
                              className="inline-flex h-7 items-center gap-1 rounded-lg border border-emerald-200 px-2.5 text-[11px] font-medium text-emerald-700 transition hover:bg-emerald-50"
                            >
                              {item.is_approved ? "Revoke" : "Approve"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteAssignment(item)}
                              disabled={asDeletingId === item.id}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={`text-slate-500 ${bodyTextClassName}`}>No courses assigned yet.</p>
            )}

            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_100px_100px_auto] sm:items-end">
              <LookupSelect
                label="Course"
                value={asCourseValue}
                selectedOption={asCourseOption}
                onChange={(nextValue, option) => {
                  setAsCourseValue(nextValue);
                  setAsCourseOption(option);
                }}
                fetchOptions={fetchCourseOptions}
                placeholder="Search course"
                emptyMessage="No courses found"
              />
              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-600">Year</label>
                <select
                  value={asYear}
                  onChange={(e) => setAsYear(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[14px] text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  {[1, 2, 3, 4, 5, 6].map((y) => (
                    <option key={y} value={y}>Year {y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[13px] font-medium text-slate-600">Session</label>
                <select
                  value={asSession}
                  onChange={(e) => setAsSession(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-[14px] text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                >
                  {[1, 2, 3].map((s) => (
                    <option key={s} value={s}>Session {s}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 items-end">
                <label className="flex items-center gap-1.5 pb-1.5 text-[13px] text-slate-600">
                  <input
                    type="checkbox"
                    checked={asApproved}
                    onChange={(e) => setAsApproved(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  Approve
                </label>
                <FormButton
                  type="button"
                  disabled={!asCourseValue || asSaving}
                  onClick={handleAddAssignment}
                  className="h-9"
                >
                  {asSaving ? "Adding..." : "Add"}
                </FormButton>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

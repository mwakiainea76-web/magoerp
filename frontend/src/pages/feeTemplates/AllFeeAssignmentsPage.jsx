import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, ChevronLeft, ChevronRight, FileText, Search } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import { SearchSelect } from "@/components/SearchSelect";
import { useAcademicSessionsApi } from "@/hooks/useAcademicSessionsApi";
import { useCurriculumFeeAssignmentsApi } from "@/hooks/useCurriculumFeeAssignmentsApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const money = (amount) => `Ksh ${Number(amount || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function AllFeeAssignmentsPage() {
  const api = useCurriculumFeeAssignmentsApi();
  const sessionsApi = useAcademicSessionsApi();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [sessions, setSessions] = useState([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [academicSessionId, setAcademicSessionId] = useState("");

  useEffect(() => {
    sessionsApi.list({ per_page: 100, status: "all", sort_by: "start_date", sort_direction: "asc" }).then((res) => {
      setSessions(res.data ?? []);
    }).catch(() => {});
  }, [sessionsApi]);

  const academicYearsMap = useMemo(() => {
    const seen = new Map();
    sessions.forEach((session) => {
      if (!seen.has(session.academic_year_id)) {
        seen.set(session.academic_year_id, { id: session.academic_year_id, name: session.academic_year_name ?? session.academic_year_code });
      }
    });
    return [...seen.values()];
  }, [sessions]);

  const yearSessions = useMemo(() => sessions
    .filter((session) => academicYearId && session.academic_year_id === academicYearId)
    .sort((left, right) => String(left.start_date ?? left.code).localeCompare(String(right.start_date ?? right.code))),
  [sessions, academicYearId]);

  const load = useCallback(async (searchQuery = "", pageNum = 1, filters = {}) => {
    setLoading(true);
    try {
      const params = { page: pageNum, per_page: 10, ...filters };
      if (searchQuery) params.q = searchQuery;
      const response = await api.searchAll(params);
      setAssignments(response.data ?? []);
      setMeta(response.meta ?? { current_page: 1, last_page: 1, total: 0 });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to load fee assignments."));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(search, page, { academic_year_id: academicYearId, academic_session_id: academicSessionId });
  }, [load, academicYearId, academicSessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchTimer = useRef(null);

  function handleSearchChange(value) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      load(value, 1, { academic_year_id: academicYearId, academic_session_id: academicSessionId });
    }, 400);
  }

  function handleFilterChange() {
    setPage(1);
    load(search, 1, { academic_year_id: academicYearId, academic_session_id: academicSessionId });
  }

  function handlePageChange(newPage) {
    if (newPage < 1 || newPage > meta.last_page) return;
    setPage(newPage);
    load(search, newPage, { academic_year_id: academicYearId, academic_session_id: academicSessionId });
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-950">Fee Assignments</h1>
          <p className="mt-1 text-sm text-slate-500">All course fee assignments across fee templates.</p>
        </div>
        <Link to="/admin/finance/fee-templates" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"><FileText className="size-4" />Fee Templates</Link>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input type="text" value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Search by fee template name or course name..." className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none" />
        </div>
        <div className="w-64">
          <SearchSelect
            options={academicYearsMap}
            value={academicYearId}
            onChange={(value) => { setAcademicYearId(value ?? ""); setAcademicSessionId(""); }}
            placeholder="Select academic year"
          />
        </div>
        {academicYearId ? (
          <select value={academicSessionId} onChange={(e) => { setAcademicSessionId(e.target.value); }} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-emerald-400 focus:outline-none">
            <option value="">All Sessions</option>
            {yearSessions.map((session) => <option key={session.id} value={session.id}>{session.name}</option>)}
          </select>
        ) : null}
        <button type="button" onClick={handleFilterChange} className="inline-flex h-10 items-center rounded-xl bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700">Apply</button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">Loading...</p>
        ) : assignments.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">{search ? "No assignments match your search." : "No fee assignments yet."}</p>
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {assignments.map((assignment) => (
                <div key={assignment.id} className="p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">
                        <Link to={`/admin/finance/fee-templates/${assignment.fee_template_id}/assign`} className="hover:text-emerald-700">{assignment.fee_template_name || "Unknown Template"}</Link>
                        <span className="mx-1.5 text-slate-300">·</span>
                        {assignment.assignment_target_name}
                        <span className="mx-1.5 text-slate-300">·</span>
                        {assignment.year_level === 0 ? "All Years" : `Year ${assignment.year_level}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {assignment.issuance_type === "per_year" ? "Per Academic Year" : `Session ${assignment.session_number}`}
                        {assignment.split_amount ? <> · {money(assignment.split_amount)}</> : null}
                      </p>
                    </div>
                    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${assignment.is_approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {assignment.is_approved ? <><BadgeCheck className="size-3" />Approved</> : "Pending"}
                    </span>
                  </div>
                  {(assignment.child_assignments ?? []).length > 0 ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {assignment.child_assignments.map((portion) => (
                        <div key={portion.id} className="rounded-xl border border-slate-200 p-3">
                          <p className="text-sm font-medium text-slate-800">{portion.academic_session_name}</p>
                          <p className="text-xs text-slate-500">{portion.split_ratio}% · {money(portion.split_amount)}</p>
                          <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${portion.dormant ? "bg-slate-100 text-slate-600" : "bg-emerald-50 text-emerald-700"}`}>{portion.dormant ? "Dormant" : "Active"}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            {meta.last_page > 1 ? (
              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
                <p className="text-sm text-slate-500">Page {meta.current_page} of {meta.last_page} · {meta.total} total</p>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => handlePageChange(page - 1)} disabled={page <= 1} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="size-4" />Prev</button>
                  <button type="button" onClick={() => handlePageChange(page + 1)} disabled={page >= meta.last_page} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Next<ChevronRight className="size-4" /></button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}

export default AllFeeAssignmentsPage;

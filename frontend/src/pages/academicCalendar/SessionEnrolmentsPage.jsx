import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
  Table,
  TableHeader,
  TableWrapper,
  Thead,
  Th,
  Tbody,
  Td,
  TableFooter,
} from "@/components/DataTable";
import { FormButton } from "@/components/FormButton";
import { useAcademicSessionEnrolmentsApi } from "@/hooks/useAcademicSessionEnrolmentsApi";
import { useAuthStore } from "@/store/authStore";
import { bodyTextClassName, labelTextClassName, selectClassName, inputClassName, initialMeta } from "@/lib/styles";
import { getApiErrorMessage } from "@/lib/api/authClient";

const statusColors = {
  enrolled: "bg-emerald-50 text-emerald-700",
  withdrawn: "bg-slate-100 text-slate-600",
};

export function SessionEnrolmentsPage() {
  const api = useAcademicSessionEnrolmentsApi();
  const role = useAuthStore((state) => state.user?.role);
  const isStudent = role === "student";

  const [myEnrolments, setMyEnrolments] = useState([]);
  const [availableSessions, setAvailableSessions] = useState([]);
  const [myLoading, setMyLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(null);

  const [enrolments, setEnrolments] = useState([]);
  const [meta, setMeta] = useState(initialMeta);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const loadMyData = useCallback(async () => {
    if (!isStudent) return;

    setMyLoading(true);
    try {
      const [enrolmentsRes, sessionsRes] = await Promise.all([
        api.myEnrolments(),
        api.availableSessions(),
      ]);
      setMyEnrolments(enrolmentsRes.data ?? []);
      setAvailableSessions(sessionsRes.data ?? []);
    } catch {
      // silent
    } finally {
      setMyLoading(false);
    }
  }, [api, isStudent]);

  useEffect(() => {
    if (isStudent) {
      loadMyData();
    }
  }, [isStudent, loadMyData, reloadKey]);

  useEffect(() => {
    if (isStudent) return;

    let isMounted = true;

    async function load() {
      setIsLoading(true);
      setError("");

      try {
        const response = await api.list({
          q: query,
          page,
          per_page: perPage,
        });

        if (isMounted) {
          setEnrolments(response.data ?? []);
          setMeta(response.meta ?? initialMeta);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getApiErrorMessage(loadError, "Server error."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, [api, isStudent, page, perPage, query, reloadKey]);

  async function handleEnroll(sessionId) {
    setEnrolling(sessionId);
    try {
      await api.enroll(sessionId);
      toast.success("Enrolled in session successfully.");
      setReloadKey((k) => k + 1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to enroll."));
    } finally {
      setEnrolling(null);
    }
  }

  function handleFilterSubmit(event) {
    event.preventDefault();
    setPage(1);
    setQuery(searchInput.trim());
  }

  function handleResetFilters() {
    setSearchInput("");
    setQuery("");
    setPerPage(10);
    setPage(1);
  }

  if (isStudent) {
    return (
      <section className="space-y-6">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Session Enrolment</h1>
          <p className="text-[13px] text-slate-500">Enroll in upcoming academic sessions</p>
        </div>

        {myLoading ? (
          <div className={`text-slate-500 ${bodyTextClassName}`}>Loading your enrolments...</div>
        ) : (
          <>
            {myEnrolments.length > 0 && (
              <Table>
                <TableHeader>
                  <h2 className="text-[1.0625rem] font-semibold text-slate-900">My Enrolments</h2>
                </TableHeader>
                <TableWrapper>
                  <Thead>
                    <tr>
                      <Th>Session</Th>
                      <Th>Code</Th>
                      <Th>Status</Th>
                      <Th>Enrolled At</Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {myEnrolments.map((e) => (
                      <tr key={e.id}>
                        <Td>{e.academic_session_name}</Td>
                        <Td>{e.academic_session_code}</Td>
                        <Td>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[e.status] ?? "bg-slate-100 text-slate-600"}`}>
                            {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                          </span>
                        </Td>
                        <Td>{e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : "—"}</Td>
                      </tr>
                    ))}
                  </Tbody>
                </TableWrapper>
              </Table>
            )}

            {availableSessions.length > 0 ? (
              <Table>
                <TableHeader>
                  <h2 className="text-[1.0625rem] font-semibold text-slate-900">Available Sessions</h2>
                </TableHeader>
                <TableWrapper>
                  <Thead>
                    <tr>
                      <Th>Session</Th>
                      <Th>Code</Th>
                      <Th>Academic Year</Th>
                      <Th>Start Date</Th>
                      <Th>End Date</Th>
                      <Th className="text-right">Action</Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {availableSessions.map((s) => (
                      <tr key={s.id}>
                        <Td>{s.name}</Td>
                        <Td>{s.code}</Td>
                        <Td>{s.academic_year}</Td>
                        <Td>{s.start_date}</Td>
                        <Td>{s.end_date}</Td>
                        <Td>
                          <div className="flex justify-end">
                            <FormButton
                              type="button"
                              size="sm"
                              disabled={enrolling === s.id}
                              onClick={() => handleEnroll(s.id)}
                            >
                              {enrolling === s.id ? "Enrolling..." : "Enroll"}
                            </FormButton>
                          </div>
                        </Td>
                      </tr>
                    ))}
                  </Tbody>
                </TableWrapper>
              </Table>
            ) : myEnrolments.length === 0 ? (
              <div className={`text-slate-500 ${bodyTextClassName}`}>No available sessions to enroll in.</div>
            ) : null}
          </>
        )}
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-[-0.01em] text-slate-950">Session Enrolments</h1>
          <p className="text-[13px] text-slate-500">Manage student academic session enrolments</p>
        </div>
      </div>

      <form
        onSubmit={handleFilterSubmit}
        className="rounded-xl border border-slate-200/80 bg-white p-5"
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,0.7fr)_auto] xl:items-end">
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Search</label>
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              className={inputClassName}
              placeholder="Search by student name or admission #"
            />
          </div>
          <div>
            <label className={`mb-2 block text-slate-600 ${labelTextClassName}`}>Per Page</label>
            <select
              value={perPage}
              onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }}
              className={`${selectClassName} w-full`}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
          <div className="flex gap-3 xl:justify-end">
            <FormButton type="submit" className="w-full sm:w-auto">Apply</FormButton>
            <FormButton type="button" variant="secondary" className="w-full sm:w-auto" onClick={handleResetFilters}>Reset</FormButton>
          </div>
        </div>
      </form>

      {error ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>{error}</div>
      ) : null}

      <Table>
        <TableHeader>
          <h2 className="text-[1.0625rem] font-semibold text-slate-900">All Enrolments</h2>
        </TableHeader>

        {isLoading ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>Loading enrolments...</div>
        ) : enrolments.length === 0 ? (
          <div className={`px-5 py-10 text-slate-500 ${bodyTextClassName}`}>No enrolments found for the current filters.</div>
        ) : (
          <TableWrapper>
            <Thead>
              <tr>
                <Th className="w-10 text-center">#</Th>
                <Th>Student</Th>
                <Th>Admission #</Th>
                <Th>Session</Th>
                <Th>Status</Th>
                <Th>Enrolled At</Th>
              </tr>
            </Thead>
            <Tbody>
              {enrolments.map((enrolment, index) => (
                <tr key={enrolment.id}>
                  <Td className="w-10 text-center text-slate-400">
                    {(meta.current_page - 1) * meta.per_page + index + 1}
                  </Td>
                  <Td>{enrolment.student_name}</Td>
                  <Td>{enrolment.admission_number}</Td>
                  <Td>{enrolment.academic_session_name ?? "—"}</Td>
                  <Td>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[enrolment.status] ?? "bg-slate-100 text-slate-600"}`}>
                      {enrolment.status.charAt(0).toUpperCase() + enrolment.status.slice(1)}
                    </span>
                  </Td>
                  <Td>{enrolment.enrolled_at ? new Date(enrolment.enrolled_at).toLocaleDateString() : "—"}</Td>
                </tr>
              ))}
            </Tbody>
          </TableWrapper>
        )}

        <TableFooter>
          <p className={`text-slate-500 ${bodyTextClassName}`}>
            {meta.total > 0
              ? `Showing ${meta.from} to ${meta.to} of ${meta.total} enrolments`
              : "No results"}
          </p>
          <div className="flex items-center gap-3">
            <FormButton
              type="button"
              variant="secondary"
              className="h-9 w-auto px-4"
              disabled={meta.current_page <= 1 || isLoading}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >Previous</FormButton>
            <span className={`text-slate-500 ${bodyTextClassName}`}>Page {meta.current_page} of {meta.last_page}</span>
            <FormButton
              type="button"
              variant="secondary"
              className="h-9 w-auto px-4"
              disabled={meta.current_page >= meta.last_page || isLoading}
              onClick={() => setPage((current) => current + 1)}
            >Next</FormButton>
          </div>
        </TableFooter>
      </Table>
    </section>
  );
}

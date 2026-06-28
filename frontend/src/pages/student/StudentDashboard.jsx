import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  BookMarked,
  BookOpen,
  CreditCard,
  GraduationCap,
  LogIn,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import toast from "react-hot-toast";

import { useStudentDashboardApi } from "@/hooks/useStudentDashboardApi";
import { getApiErrorMessage } from "@/lib/api/authClient";

const currency = (amount) =>
  `Ksh ${new Intl.NumberFormat("en-KE", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0))}`;

export function StudentDashboard() {
  const { dashboard, registerSession, registerUnits } = useStudentDashboardApi();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [registeringUnits, setRegisteringUnits] = useState(false);
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);
  const [registerErrors, setRegisterErrors] = useState(null);
  const cancelledRef = useRef(false);

  async function loadDashboard() {
    cancelledRef.current = false;
    setLoading(true);
    setError(null);

    try {
      const res = await dashboard();
      if (!cancelledRef.current) setData(res.data);
    } catch (err) {
      if (!cancelledRef.current) setError(err?.response?.data?.message ?? "Failed to load dashboard.");
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    return () => { cancelledRef.current = true; };
  }, []);

  useEffect(() => {
    setSelectedUnitIds(data?.registered_unit_ids ?? []);
  }, [data?.registered_unit_ids]);

  async function handleRegisterSession(e) {
    e.preventDefault();
    setRegistering(true);
    setRegisterErrors(null);
    try {
      await registerSession();
      toast.success("Session registered successfully.");
      setShowModal(false);
      loadDashboard();
    } catch (err) {
      const msg = err?.response?.data?.message ?? "Failed to register session.";
      setRegisterErrors({ session_registration: msg });
    } finally {
      setRegistering(false);
    }
  }

  function handleUnitToggle(unitId) {
    setSelectedUnitIds((current) =>
      current.includes(unitId)
        ? current.filter((id) => id !== unitId)
        : [...current, unitId],
    );
  }

  async function handleRegisterUnits() {
    const sessionEnrolmentId = data?.last_session_enrolment?.id;
    if (!sessionEnrolmentId) {
      toast.error("Register the session before selecting units.");
      return;
    }

    if (selectedUnitIds.length === 0) {
      toast.error("Select at least one unit.");
      return;
    }

    setRegisteringUnits(true);
    try {
      const res = await registerUnits({
        academic_session_enrolment_id: sessionEnrolmentId,
        unit_ids: selectedUnitIds,
      });
      toast.success(res.message ?? "Units registered.");
      await loadDashboard();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to register units."));
    } finally {
      setRegisteringUnits(false);
    }
  }

  if (loading) {
    return (
      <section className="space-y-5">
        <div className="h-52 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="h-36 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-36 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-36 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-36 animate-pulse rounded-3xl bg-slate-200" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="h-96 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-64 animate-pulse rounded-3xl bg-slate-200" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex min-h-[40vh] items-center justify-center">
        <div className="max-w-md rounded-3xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-red-700">Something went wrong</p>
          <p className="mt-2 text-sm text-red-500">{error}</p>
        </div>
      </section>
    );
  }

  const { student, course, enrolment, fee_template: fee_plan, needs_session_enrolment, current_session, last_session_enrolment, finance, progress, available_units = [] } = data ?? {};
  const hasAvailableUnits = available_units.length > 0;
  const allVisibleUnitsRegistered = hasAvailableUnits && available_units.every((unit) => unit.registered);
  const isEnrolledInCurrentSession = Boolean(
    current_session?.id
      && last_session_enrolment?.academic_session_id === current_session.id
      && last_session_enrolment?.session_active,
  );
  const currentSessionName = isEnrolledInCurrentSession
    ? last_session_enrolment.session_name
    : enrolment?.academic_session?.name;

  const statsCards = [
    {
      label: "Outstanding Balance",
      value: currency(finance?.outstanding_balance ?? 0),
      helper: finance?.next_due_date ? `Next due ${finance.next_due_date}` : "No invoice due date available",
      icon: Wallet,
      tone: "from-emerald-500 to-emerald-600",
    },
    {
      label: "Total Paid",
      value: currency(finance?.total_paid ?? 0),
      helper: "Payments recorded on your account",
      icon: CreditCard,
      tone: "from-slate-700 to-slate-800",
    },
    {
      label: "Current Module",
      value: course?.code ?? "-",
      helper: currentSessionName ?? "No active session yet",
      icon: GraduationCap,
      tone: "from-sky-500 to-cyan-500",
    },
    {
      label: "Fee Discount",
      value: "0%",
      helper: "Current approved discount",
      icon: ShieldCheck,
      tone: "from-amber-500 to-orange-500",
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-700">
      <div className="relative overflow-hidden rounded-[2rem] bg-[#1b263b] px-8 py-10 text-white shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.25),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.08),_transparent_25%)]" />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Student Portal
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Welcome back, {student?.name ?? "Student"}.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-slate-300">
              Keep track of your course progress, current session,
              billing status, and learning units from one place.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-300">Course</p>
              <p className="mt-2 text-sm font-semibold">{course?.name ?? "Not assigned"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-300">Level</p>
              <p className="mt-2 text-sm font-semibold">{course?.level ?? "Not assigned"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-300">Reg. No</p>
              <p className="mt-2 text-sm font-semibold">{student?.admission_number ?? "-"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-slate-300">Status</p>
              <p className="mt-2 text-sm font-semibold capitalize">{enrolment?.status ?? "-"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {statsCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-[1.75rem] border border-zinc-100 bg-white p-6 shadow-sm"
            >
              <div
                className={`inline-flex rounded-2xl bg-gradient-to-br ${card.tone} p-3 text-white shadow-lg`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-5 text-sm font-medium text-zinc-500">{card.label}</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">{card.value}</p>
              <p className="mt-2 text-sm text-zinc-400">{card.helper}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <div className="rounded-[1.75rem] border border-zinc-100 bg-white p-7 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-zinc-900">
                Course Details
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Your enrolled course and curriculum information.
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                to="/"
                className="text-sm font-medium text-emerald-700 transition hover:text-emerald-800"
              >
                View Course
              </Link>
            </div>
          </div>

          <div className="mt-6">
            <div className="space-y-3">
              {course ? (
                <>
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Code</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">{course.code}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Name</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">{course.name}</p>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Duration</p>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                      {course.duration ? `${course.duration} year${course.duration > 1 ? "s" : ""}` : "-"}
                    </p>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl bg-zinc-50 px-4 py-4 text-sm text-zinc-500">
                  No course information available.
                </div>
              )}
            </div>

            <div className="mt-3 space-y-3">
              <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                <p className="text-sm text-zinc-500">Curriculum</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">
                  {enrolment?.curriculum?.name ?? course?.curriculum?.name ?? "Not assigned"}
                </p>
              </div>
              <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                <p className="text-sm text-zinc-500">Current Session</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">
                  {currentSessionName ?? "No session enrollment yet"}
                </p>
              </div>
              <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                <p className="text-sm text-zinc-500">Progress</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">
                  {progress?.total_sessions > 0
                    ? `Year ${progress.current_year} - Module ${progress.current_module}`
                    : "Not started"}
                </p>
                {progress?.total_sessions > 0 ? (
                  <div className="mt-2">
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-zinc-200">
                      <div
                        className="rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${(progress.current_module / progress.modules_per_year) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-400">
                      Module {progress.current_module} of {progress.modules_per_year}
                      {progress.total_sessions > 0 ? ` - ${progress.total_sessions} total` : ""}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[1.75rem] border border-zinc-100 bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-900">
                Study Snapshot
              </h2>
              <div className="flex items-center gap-3">
                {!isEnrolledInCurrentSession && current_session && (
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                  >
                    <LogIn className="h-3.5 w-3.5" />
                    Register Session
                  </button>
                )}
                <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
                  <BookMarked className="h-5 w-5" />
                </div>
              </div>
            </div>

            {isEnrolledInCurrentSession ? (
              <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-sm">
                <p className="font-semibold text-emerald-900">
                  You are registered for <strong>{last_session_enrolment.session_name}</strong>
                </p>
              </div>
            ) : current_session ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm">
                <p className="font-semibold text-amber-900">
                  {last_session_enrolment?.session_active === false
                    ? `Your last session (${last_session_enrolment.session_name}) is no longer active.`
                    : "You haven't registered for any session yet."}
                </p>
                <p className="mt-2 text-amber-800">
                  The active session <strong>{current_session.name}</strong> is available.
                  Click <strong>Register Session</strong> above to enrol.
                </p>
              </div>
            ) : null}

            <div className="mt-5 space-y-4 text-sm">
              {isEnrolledInCurrentSession ? (
                <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-zinc-900">Unit Registration</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Tick the units you want to register for this session.
                      </p>
                    </div>
                    {!allVisibleUnitsRegistered ? (
                      <button
                        type="button"
                        onClick={handleRegisterUnits}
                        disabled={registeringUnits || selectedUnitIds.length === 0}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {registeringUnits ? "Saving..." : "Register Units"}
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-4 space-y-2">
                    {available_units.length > 0 ? (
                      available_units.map((unit) => (
                        <label
                          key={unit.id}
                          className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-3 transition hover:border-emerald-200 hover:bg-emerald-50/50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUnitIds.includes(unit.id)}
                            onChange={() => handleUnitToggle(unit.id)}
                            disabled={unit.registered || allVisibleUnitsRegistered}
                            className="mt-1 h-4 w-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="min-w-0">
                            <span className="block font-semibold text-zinc-900">
                              {unit.code} - {unit.name}
                            </span>
                            <span className="mt-1 block text-xs text-zinc-500">
                              {unit.registered ? "Already registered" : "Available for registration"}
                              {unit.module ? ` - Module ${unit.module}` : ""}
                            </span>
                          </span>
                        </label>
                      ))
                    ) : (
                      <div className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-4 text-xs text-zinc-500">
                        No units are available for your current course, curriculum, and module.
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              <div className="hidden">
                <p className="text-zinc-500">Progress</p>
                <p className="mt-1 font-semibold text-zinc-900">
                  {progress?.total_sessions > 0
                    ? `Year ${progress.current_year} — Module ${progress.current_module}`
                    : "Not started"}
                </p>
                {progress?.total_sessions > 0 ? (
                  <div className="mt-2">
                    <div className="flex h-1.5 overflow-hidden rounded-full bg-zinc-200">
                      <div
                        className="rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${(progress.current_module / progress.modules_per_year) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] text-zinc-400">
                      Module {progress.current_module} of {progress.modules_per_year}
                      {progress.total_sessions > 0 ? ` · ${progress.total_sessions} total` : ""}
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-900">Register Current Session</h3>
                <p className="mt-1 text-sm text-zinc-500">Register yourself for the active academic session.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-xl p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleRegisterSession} className="space-y-5 pt-5">
              <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Admission Number</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">{student?.admission_number ?? "-"}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Active Session</p>
                <p className="mt-1 text-sm font-semibold text-zinc-900">{current_session?.name ?? "No active session available"}</p>
              </div>

              <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">You will be enrolled as</p>
                <p className="mt-1 text-sm font-semibold text-emerald-900">
                  {progress
                    ? `Module ${progress.total_sessions + 1} — Year ${Math.floor((progress.total_sessions) / 3) + 1} Session ${(progress.total_sessions % 3) + 1}`
                    : "Module 1 — Year 1 Session 1"}
                </p>
              </div>

              {registerErrors?.session_registration ? (
                <p className="text-sm text-red-600">{registerErrors.session_registration}</p>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl bg-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering || !current_session}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  {registering ? "Registering..." : "Register Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

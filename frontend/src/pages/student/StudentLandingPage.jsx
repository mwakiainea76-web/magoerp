import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card } from "flowbite-react";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  ClipboardCheck,
  Coins,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  School,
} from "lucide-react";

import { useStudentDashboardApi } from "@/hooks/useStudentDashboardApi";

const quickLinks = [
  { label: "My Courses", to: "/my-courses", icon: BookOpen, color: "bg-cyan-100 text-cyan-700" },
  { label: "Timetable", to: "/timetables", icon: CalendarClock, color: "bg-amber-100 text-amber-700" },
  { label: "Assessments", to: "/assessments", icon: ClipboardCheck, color: "bg-purple-100 text-purple-700" },
  { label: "Fee Statements", to: "/finance/statements", icon: Coins, color: "bg-emerald-100 text-emerald-700" },
  { label: "Reports", to: "/reports", icon: LayoutDashboard, color: "bg-blue-100 text-blue-700" },
  { label: "School Info", to: "/school-info", icon: School, color: "bg-rose-100 text-rose-700" },
  { label: "Session Enrolment", to: "/", icon: LogIn, color: "bg-orange-100 text-orange-700" },
];

export function StudentLandingPage() {
  const { dashboard } = useStudentDashboardApi();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    dashboard()
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dashboard]);

  const { student, course, enrolment, current_session, needs_session_enrolment } = data ?? {};

  const links = quickLinks.map((link) => {
    if (link.label === "Session Enrolment" && needs_session_enrolment) {
      return { ...link, cardAccent: true, color: "bg-emerald-100 text-emerald-700" };
    }
    return link;
  });

  return (
    <section className="space-y-6">
      {needs_session_enrolment && current_session && (
        <Card className="rounded-3xl border-0 bg-[linear-gradient(135deg,_#059669_0%,_#10b981_180%)] text-white shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
                <LogIn className="size-6" />
              </div>
              <div>
                <p className="text-lg font-semibold">Enrol in a Session</p>
                <p className="text-sm text-emerald-100">
                  You are not yet enrolled in <strong>{current_session.name}</strong>. Enrol now to access your units and course content.
                </p>
              </div>
            </div>
            <Button color="light" className="shrink-0" as={Link} to="/">
              Enrol Now
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,_#0f172a_0%,_#0f766e_55%,_#ecfeff_180%)] text-white shadow-lg">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-4">
            <Badge color="info" className="w-fit">
              Student Portal
            </Badge>
            <div className="space-y-2">
              {loading ? (
                <div className="h-10 w-64 animate-pulse rounded-lg bg-white/10" />
              ) : (
                <h1 className="text-3xl font-semibold sm:text-4xl">
                  Welcome, {student?.name?.split(" ")[0] ?? "Student"}
                </h1>
              )}
              {loading ? (
                <div className="h-5 w-48 animate-pulse rounded bg-white/10" />
              ) : (
                <p className="max-w-2xl text-sm text-cyan-50/90 sm:text-base">
                  {student?.admission_number
                    ? `${student.admission_number} · ${course?.name ?? ""}`
                    : "Track your academic journey from here."}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm text-cyan-50/80">Course</p>
              {loading ? (
                <div className="mt-2 h-6 w-20 animate-pulse rounded bg-white/10" />
              ) : (
                <p className="mt-2 truncate text-xl font-semibold">{course?.code ?? "—"}</p>
              )}
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm text-cyan-50/80">Session</p>
              {loading ? (
                <div className="mt-2 h-6 w-24 animate-pulse rounded bg-white/10" />
              ) : (
                <p className="mt-2 truncate text-xl font-semibold">
                  {enrolment?.academic_session?.name ?? "—"}
                </p>
              )}
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm text-cyan-50/80">Status</p>
              {loading ? (
                <div className="mt-2 h-6 w-16 animate-pulse rounded bg-white/10" />
              ) : (
                <p className="mt-2 text-xl font-semibold">
                  {enrolment ? (
                    <Badge color={enrolment.status === "enrolled" ? "success" : "warning"} size="sm">
                      {enrolment.status}
                    </Badge>
                  ) : "—"}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-slate-800">Quick Links</h2>
        <p className="text-sm text-slate-500">Navigate to your most-used sections.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((link) => (
          <Link key={link.label} to={link.to}>
            <Card className={`group rounded-3xl border shadow-sm transition hover:shadow-md ${
              link.cardAccent
                ? "border-emerald-300 bg-emerald-50 hover:border-emerald-400"
                : "border-slate-200/80 hover:border-slate-300"
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-2xl p-3 ${link.color}`}>
                    <link.icon className="size-5" />
                  </div>
                  <p className={`font-semibold ${
                    link.cardAccent ? "text-emerald-800" : "text-slate-700"
                  }`}>{link.label}</p>
                </div>
                <ArrowRight className={`size-4 transition group-hover:translate-x-0.5 ${
                  link.cardAccent ? "text-emerald-500" : "text-slate-400 group-hover:text-slate-600"
                }`} />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <GraduationCap className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Your Profile</p>
            <h3 className="text-xl font-semibold text-slate-950">At a Glance</h3>
          </div>
        </div>
        {loading ? (
          <div className="mt-4 space-y-3">
            <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-36 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-56 animate-pulse rounded bg-slate-200" />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="font-medium text-slate-500">Full Name</p>
              <p className="text-slate-700">{student?.name ?? "—"}</p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Admission No.</p>
              <p className="text-slate-700">{student?.admission_number ?? "—"}</p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Course</p>
              <p className="text-slate-700">{course?.code ? `${course.code} - ${course.name}` : "—"}</p>
            </div>
            <div>
              <p className="font-medium text-slate-500">Curriculum</p>
              <p className="text-slate-700">{enrolment?.curriculum?.name ?? "—"}</p>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}

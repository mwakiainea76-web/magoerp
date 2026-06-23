import { useEffect, useState } from "react";
import { Badge, Card, Table } from "flowbite-react";
import { BookOpen, Coins, GraduationCap, School, User } from "lucide-react";

import { useStudentDashboardApi } from "@/hooks/useStudentDashboardApi";

export function StudentDashboard() {
  const { dashboard } = useStudentDashboardApi();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    dashboard()
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.data?.message ?? "Failed to load dashboard.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dashboard]);

  if (loading) {
    return (
      <section className="space-y-5">
        <div className="h-52 animate-pulse rounded-3xl bg-slate-200" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="h-44 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-44 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-44 animate-pulse rounded-3xl bg-slate-200" />
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="flex min-h-[40vh] items-center justify-center">
        <Card className="max-w-md rounded-3xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
          <p className="text-lg font-semibold text-red-700">Something went wrong</p>
          <p className="mt-2 text-sm text-red-500">{error}</p>
        </Card>
      </section>
    );
  }

  const { student, course, enrolment, fee_plan } = data ?? {};

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,_#0f172a_0%,_#0f766e_55%,_#ecfeff_180%)] text-white shadow-lg">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-4">
            <Badge color="info" className="w-fit">
              Student workspace
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold sm:text-4xl">
                Welcome back, {student?.name ?? "Student"}
              </h1>
              <p className="max-w-2xl text-sm text-cyan-50/90 sm:text-base">
                {student?.admission_number
                  ? `Admission No: ${student.admission_number}`
                  : "Track your academic progress, fees, and upcoming work."}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm text-cyan-50/80">Enrolled Course</p>
              <p className="mt-2 truncate text-2xl font-semibold">
                {course?.code ?? "—"}
              </p>
              <p className="mt-1 truncate text-sm text-cyan-100">
                {course?.name ?? "Not assigned"}
              </p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm text-cyan-50/80">Current Session</p>
              <p className="mt-2 truncate text-2xl font-semibold">
                {enrolment?.academic_session?.name ?? "—"}
              </p>
              <p className="mt-1 text-sm text-cyan-100">
                {enrolment?.enrolment_date ?? "Not enrolled"}
              </p>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-sm text-cyan-50/80">Fee Plan Total</p>
              <p className="mt-2 text-2xl font-semibold">
                {fee_plan ? `Ksh ${fee_plan.total_amount?.toLocaleString()}` : "—"}
              </p>
              <p className="mt-1 text-sm text-cyan-100">
                {fee_plan?.items?.length ?? 0} item{fee_plan?.items?.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-700">
                <GraduationCap className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Course</p>
                <h3 className="text-xl font-semibold text-slate-950">
                  {course?.code ?? "N/A"}
                </h3>
              </div>
            </div>
            <div className="space-y-1.5 text-sm text-slate-600">
              <p><span className="font-medium text-slate-500">Name:</span> {course?.name ?? "—"}</p>
              <p><span className="font-medium text-slate-500">Level:</span> {course?.level ?? "—"}</p>
              <p><span className="font-medium text-slate-500">Duration:</span> {course?.duration ? `${course.duration} year${course.duration > 1 ? "s" : ""}` : "—"}</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <BookOpen className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Enrolment</p>
                <h3 className="text-xl font-semibold text-slate-950">Current Status</h3>
              </div>
            </div>
            <div className="space-y-1.5 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-500">Status:</span>{" "}
                {enrolment ? (
                  <Badge color={enrolment.status === "enrolled" ? "success" : "warning"} size="xs" className="inline">
                    {enrolment.status}
                  </Badge>
                ) : "—"}
              </p>
              <p><span className="font-medium text-slate-500">Curriculum:</span> {enrolment?.curriculum?.name ?? "—"}</p>
              <p><span className="font-medium text-slate-500">Enrolled:</span> {enrolment?.enrolment_date ?? "—"}</p>
            </div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                <Coins className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Fee Plan</p>
                <h3 className="text-xl font-semibold text-slate-950">
                  {fee_plan?.code ?? "N/A"}
                </h3>
              </div>
            </div>
            <div className="space-y-1.5 text-sm text-slate-600">
              <p><span className="font-medium text-slate-500">Plan:</span> {fee_plan?.name ?? "—"}</p>
              <p>
                <span className="font-medium text-slate-500">Status:</span>{" "}
                {fee_plan ? (
                  <Badge color={fee_plan.is_approved ? "success" : "warning"} size="xs" className="inline">
                    {fee_plan.is_approved ? "Approved" : "Pending"}
                  </Badge>
                ) : "—"}
              </p>
              <p><span className="font-medium text-slate-500">Total:</span> {fee_plan ? `Ksh ${fee_plan.total_amount?.toLocaleString()}` : "—"}</p>
            </div>
          </div>
        </Card>
      </div>

      {fee_plan?.items?.length > 0 && (
        <Card className="rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
              <School className="size-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Fee Breakdown</p>
              <h3 className="text-xl font-semibold text-slate-950">
                {fee_plan.name}
                <span className="ml-2 text-sm font-normal text-slate-400">
                  Yr {fee_plan.year_level} · Sem {fee_plan.session_number}
                </span>
              </h3>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <Table>
              <Table.Head>
                <Table.HeadCell>Item</Table.HeadCell>
                <Table.HeadCell>Description</Table.HeadCell>
                <Table.HeadCell className="text-right">Amount (Ksh)</Table.HeadCell>
              </Table.Head>
              <Table.Body className="divide-y">
                {fee_plan.items.map((item) => (
                  <Table.Row key={item.id} className="bg-white">
                    <Table.Cell className="font-medium text-slate-700">{item.name}</Table.Cell>
                    <Table.Cell className="text-slate-500">{item.description ?? "—"}</Table.Cell>
                    <Table.Cell className="text-right font-semibold text-slate-700">
                      {item.amount?.toLocaleString()}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
          <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
            <p className="text-lg font-bold text-slate-800">
              Total: Ksh {fee_plan.total_amount?.toLocaleString()}
            </p>
          </div>
        </Card>
      )}

      <Card className="rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <User className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Profile</p>
            <h3 className="text-xl font-semibold text-slate-950">Personal Information</h3>
          </div>
        </div>
        <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="font-medium text-slate-500">Full Name</p>
            <p className="text-slate-700">{student?.name ?? "—"}</p>
          </div>
          <div>
            <p className="font-medium text-slate-500">Admission Number</p>
            <p className="text-slate-700">{student?.admission_number ?? "—"}</p>
          </div>
          <div>
            <p className="font-medium text-slate-500">Course</p>
            <p className="text-slate-700">{course?.name ?? "—"}</p>
          </div>
        </div>
      </Card>
    </section>
  );
}

import { Badge, Button, Card, Progress } from "flowbite-react";
import { ArrowRight, BookOpen, CalendarDays, CircleCheckBig, Users } from "lucide-react";

const contentByRole = {
  admin: {
    label: "Admin",
    title: "Institution overview",
    description: "Keep academic operations, staffing, and enrolment health visible from one place.",
    heroStats: [
      { label: "Active learners", value: "2,184", change: "+8.2%" },
      { label: "Departments", value: "14", change: "+2" },
      { label: "Pending approvals", value: "19", change: "-5 today" },
    ],
    metrics: [
      { label: "Admission target", value: "78%", tone: "cyan" },
      { label: "Fee compliance", value: "64%", tone: "emerald" },
      { label: "Timetable readiness", value: "89%", tone: "amber" },
    ],
    tasks: ["Approve new trainers", "Review academic calendar", "Publish updated timetable"],
  },
  trainer: {
    label: "Trainer",
    title: "Teaching pipeline",
    description: "Track cohorts, delivery status, and the next actions needed for your classes.",
    heroStats: [
      { label: "Units in session", value: "8", change: "+1 this week" },
      { label: "Attendance average", value: "92%", change: "+4.3%" },
      { label: "Assessments due", value: "11", change: "3 urgent" },
    ],
    metrics: [
      { label: "Syllabus coverage", value: "71%", tone: "cyan" },
      { label: "Assignment marking", value: "58%", tone: "emerald" },
      { label: "Learner engagement", value: "84%", tone: "amber" },
    ],
    tasks: ["Upload session notes", "Mark practical reports", "Message inactive learners"],
  },
  student: {
    label: "Student",
    title: "Learning progress",
    description: "See your current academic standing, upcoming work, and course momentum at a glance.",
    heroStats: [
      { label: "Current units", value: "6", change: "Full load" },
      { label: "Average score", value: "81%", change: "+6.1%" },
      { label: "Upcoming deadlines", value: "4", change: "Next in 2 days" },
    ],
    metrics: [
      { label: "Semester progress", value: "67%", tone: "cyan" },
      { label: "Attendance", value: "94%", tone: "emerald" },
      { label: "Assignment completion", value: "76%", tone: "amber" },
    ],
    tasks: ["Submit database project", "Revise for CAT 2", "Confirm exam card details"],
  },
};

const toneClasses = {
  cyan: "bg-cyan-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
};

export function RoleDashboard({ role }) {
  const content = contentByRole[role] ?? contentByRole.student;

  return (
    <section className="space-y-5">
      <Card className="overflow-hidden border-0 bg-[linear-gradient(135deg,_#0f172a_0%,_#0f766e_55%,_#ecfeff_180%)] text-white shadow-lg">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-4">
            <Badge color="info" className="w-fit">
              {content.label} workspace
            </Badge>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold sm:text-4xl">{content.title}</h1>
              <p className="max-w-2xl text-sm text-cyan-50/90 sm:text-base">{content.description}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button color="light">
                Open reports
                <ArrowRight className="ml-2 size-4" />
              </Button>
              <Button color="light" outline>
                Quick actions
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {content.heroStats.map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-sm text-cyan-50/80">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
                <p className="mt-1 text-sm text-cyan-100">{stat.change}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-6 md:grid-cols-3">
          {content.metrics.map((metric) => (
            <Card key={metric.label} className="rounded-3xl border border-slate-200/80 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">{metric.label}</p>
                  <CircleCheckBig className="size-4 text-emerald-500" />
                </div>
                <p className="text-3xl font-semibold text-slate-950">{metric.value}</p>
                <Progress progress={Number.parseInt(metric.value, 10)} color="cyan" size="lg" />
                <div className={`h-1.5 rounded-full ${toneClasses[metric.tone]}`} />
              </div>
            </Card>
          ))}
        </div>

        <Card className="rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Priority queue</p>
                <h2 className="text-2xl font-semibold text-slate-950">What needs attention</h2>
              </div>
              <Badge color="warning">Today</Badge>
            </div>

            <div className="space-y-3">
              {content.tasks.map((task) => (
                <div
                  key={task}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-slate-900 p-2 text-white">
                      <CalendarDays className="size-4" />
                    </div>
                    <p className="font-medium text-slate-700">{task}</p>
                  </div>
                  <Button color="light" size="xs">
                    Review
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-100 p-3 text-cyan-700">
                <Users className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">People</p>
                <h3 className="text-xl font-semibold text-slate-950">Collaboration pulse</h3>
              </div>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Teams are aligning well this week, with stronger response times and fewer blocked approvals.
            </p>
          </div>
        </Card>

        <Card className="rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <BookOpen className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Academics</p>
                <h3 className="text-xl font-semibold text-slate-950">Content readiness</h3>
              </div>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Most materials are on track, and only a small set of uploads still need review before release.
            </p>
          </div>
        </Card>

        <Card className="rounded-3xl border border-slate-200/80 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                <CircleCheckBig className="size-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Performance</p>
                <h3 className="text-xl font-semibold text-slate-950">Healthy momentum</h3>
              </div>
            </div>
            <p className="text-sm leading-6 text-slate-600">
              Key operational indicators are stable, giving you room to focus on the next round of improvements.
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}

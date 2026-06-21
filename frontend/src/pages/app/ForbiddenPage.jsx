import { Link } from "react-router";

import { useAuthStore } from "@/store/authStore";
import { getDashboardPath } from "@/support/dashboardPaths";

export function ForbiddenPage() {
  const role = useAuthStore((state) => state.user?.role);
  const dashboardPath = getDashboardPath(role);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-rose-600">403 Forbidden</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">
          You do not have permission to view this page.
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your account is signed in, but it is not allowed to access the requested area.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to={dashboardPath}
            className="inline-flex items-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Return to dashboard
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
          >
            Switch account
          </Link>
        </div>
      </div>
    </div>
  );
}

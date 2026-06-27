export function StudentAccountCard({ balance = 0, studentName, admissionNumber, loading = false }) {
  const isOverdue = balance > 0;

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 rounded bg-slate-200" />
          <div className="h-8 w-32 rounded bg-slate-200" />
          <div className="h-3 w-48 rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13px] font-medium text-slate-500">Account Balance</p>
          <p className={`mt-1 text-2xl font-bold tracking-tight ${isOverdue ? "text-red-600" : "text-emerald-600"}`}>
            Ksh {Number(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          {studentName ? (
            <p className="mt-2 text-[12px] text-slate-400">
              {studentName}{admissionNumber ? ` (${admissionNumber})` : ""}
            </p>
          ) : null}
        </div>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${isOverdue ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {isOverdue ? "Overdue" : "Clear"}
        </span>
      </div>
    </div>
  );
}

import { Settings2 } from "lucide-react";

export function FinanceSettingsPage() {
  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">Finance Settings</h1>
        <p className="mt-1 text-[14px] text-slate-500">Configure finance module settings.</p>
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Settings2 className="h-12 w-12 text-slate-300" />
          <h2 className="text-[16px] font-semibold text-slate-500">Settings</h2>
          <p className="max-w-md text-[13px] text-slate-400">
            Finance settings will be available here in a future update.
          </p>
        </div>
      </div>
    </section>
  );
}

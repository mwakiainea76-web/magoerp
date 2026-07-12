export function BillingActionTabs({ actions, activeAction, onSelect }) {
  return (
    <div className="w-full overflow-x-auto rounded-md border border-slate-200 bg-white p-1">
      <div className="grid min-w-max grid-cols-6 gap-1">
        {actions.map((action) => {
          const Icon = action.icon;
          const isActive = activeAction === action.id;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onSelect(action.id)}
              aria-pressed={isActive}
              className={`inline-flex h-9 min-w-[116px] items-center justify-center gap-1.5 rounded border px-3 text-[11px] font-semibold leading-none transition ${
                isActive
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-transparent bg-white text-slate-500 hover:border-emerald-100 hover:bg-emerald-50/60 hover:text-emerald-700"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{action.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

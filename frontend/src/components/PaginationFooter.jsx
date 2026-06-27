export function PaginationFooter({ page, perPage, total, lastPage, onPageChange, onPerPageChange }) {
  if (total <= 0) return null;

  return (
    <>
      <div className="flex items-center gap-2 text-[13px] text-slate-500">
        <span>Rows:</span>
        <select
          value={perPage}
          onChange={(e) => { onPerPageChange(Number(e.target.value)); onPageChange(1); }}
          className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[13px] text-slate-700 outline-none focus:border-emerald-400"
        >
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
        <span>of {total}</span>
      </div>
      <div className="flex items-center gap-1 text-[13px]">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className="rounded-md border border-slate-200 px-2.5 py-1 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Prev
        </button>
        {Array.from({ length: Math.min(lastPage, 5) }, (_, i) => {
          const start = Math.max(1, page - 2);
          const p = start + i;
          if (p > lastPage) return null;
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`min-w-[28px] rounded-md px-2 py-1 font-medium transition ${
                p === page
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p}
            </button>
          );
        })}
        <button
          type="button"
          disabled={page >= lastPage}
          onClick={() => onPageChange(Math.min(lastPage, page + 1))}
          className="rounded-md border border-slate-200 px-2.5 py-1 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </>
  );
}

export function Table({ children, className = "" }) {
  return (
    <div className={`rounded-xl border border-slate-200/80 bg-white overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

export function TableHeader({ children }) {
  return (
    <div className="border-b border-slate-200 px-5 py-3">
      {children}
    </div>
  );
}

export function TableWrapper({ children }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-[14px] leading-6">
        {children}
      </table>
    </div>
  );
}

export function Thead({ children }) {
  return (
    <thead className="bg-slate-50/80">
      {children}
    </thead>
  );
}

export function Th({ children, className = "" }) {
  const base = "px-3 py-1.5 text-[11px] font-semibold text-slate-500";
  const align = className.includes("text-") ? "" : "text-left";
  return (
    <th className={`${base} ${align} ${className}`.trim()}>
      {children}
    </th>
  );
}

export function SortableTh({ children, sortKey, sortBy, sortDirection, onSort, className = "" }) {
  const isActive = sortBy === sortKey;
  const base = "px-3 py-1.5 text-[11px] font-semibold cursor-pointer select-none";
  const color = isActive ? "text-emerald-600" : "text-slate-500";
  const align = className.includes("text-") ? "" : "text-left";

  function handleClick() {
    onSort(sortKey, isActive && sortDirection === "asc" ? "desc" : "asc");
  }

  return (
    <th className={`${base} ${color} ${align} ${className}`.trim()} onClick={handleClick}>
      <span className="inline-flex items-center gap-1">
        {children}
        {isActive && <span>{sortDirection === "asc" ? "↑" : "↓"}</span>}
      </span>
    </th>
  );
}

export function Tbody({ children }) {
  return (
    <tbody className="divide-y divide-slate-100">
      {children}
    </tbody>
  );
}

export function Td({ children, className = "" }) {
  const base = "px-3 py-1.5 text-slate-600";
  const align = className.includes("text-") ? "" : "text-left";
  return (
    <td className={`${base} ${align} ${className}`.trim()}>
      {children}
    </td>
  );
}

export function TableFooter({ children }) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
      {children}
    </div>
  );
}

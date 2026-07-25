import { ChevronDown } from "lucide-react";

function HighlightedText({ text, query }) {
  if (!query) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="rounded bg-emerald-100 px-0.5 text-emerald-900">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}

export function AccessPermissionForm({
  groupedPermissions,
  assignedIds,
  onToggle,
  loading,
  searchQuery,
  expandedSections,
  onToggleSection,
}) {
  if (groupedPermissions.length === 0) {
    return (
      <p className="px-5 py-8 text-center text-[14px] leading-6 text-slate-500">
        No permissions available.
      </p>
    );
  }

  return (
    <div>
      {groupedPermissions.map((group, idx) => {
        const permissions = searchQuery
          ? group.permissions.filter((p) =>
              p.name.toLowerCase().includes(searchQuery.toLowerCase()),
            )
          : group.permissions;

        if (searchQuery && permissions.length === 0) return null;

        const totalInGroup = group.permissions.length;
        const selectedInGroup = group.permissions.filter((p) =>
          assignedIds.has(p.id),
        ).length;
        const isExpanded = expandedSections.has(group.group);

        return (
          <div key={group.group}>
            <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white transition-colors hover:bg-slate-50">
              <button
                type="button"
                onClick={() => onToggleSection(group.group)}
                className="flex w-full items-center gap-2 px-5 py-2.5 text-left outline-none"
              >
                <ChevronDown
                  className={`h-4 w-4 text-slate-400 transition ${
                    isExpanded ? "" : "-rotate-90"
                  }`}
                />
                <span className="text-[14px] font-medium capitalize text-slate-800">
                  {group.group}
                </span>
                <span className="text-[12px] text-slate-400">
                  {selectedInGroup}/{totalInGroup} selected
                </span>
              </button>
            </div>

            {isExpanded && (
              <div className="px-5 pb-4 pt-3">
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {permissions.map((perm) => {
                    const isChecked = assignedIds.has(perm.id);
                    return (
                    <label
                      key={perm.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-[13px] transition min-w-0 ${
                        isChecked
                          ? "border-emerald-200 bg-emerald-50/50 text-emerald-800"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={assignedIds.has(perm.id)}
                        disabled={loading}
                        onChange={() => onToggle(perm.id)}
                        className="h-4 w-4 rounded border-slate-300 accent-emerald-600 focus:ring-emerald-500"
                      />
                      <HighlightedText text={perm.name} query={searchQuery} />
                    </label>
                    );
                  })}
                </div>
              </div>
            )}
            {idx < groupedPermissions.length - 1 && <div className="h-3" />}
          </div>
        );
      })}
    </div>
  );
}

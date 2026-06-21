import { bodyTextClassName } from "@/lib/styles";

export function AccessPermissionForm({
  groupedPermissions,
  assignedIds,
  onToggle,
  loading,
}) {
  return (
    <div className="space-y-6">
      {groupedPermissions.length === 0 ? (
        <p className={`text-slate-500 ${bodyTextClassName}`}>No permissions available.</p>
      ) : (
        groupedPermissions.map((group) => (
          <div key={group.group}>
            <h3 className="mb-2 text-[14px] font-semibold capitalize text-slate-800">
              {group.group}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {group.permissions.map((perm) => (
                <label
                  key={perm.id}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[13px] text-slate-600 transition hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={assignedIds.has(perm.id)}
                    disabled={loading}
                    onChange={() => onToggle(perm.id)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  {perm.name}
                </label>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

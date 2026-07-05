import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { FormButton } from "@/components/FormButton";
import { useAccessRolesApi } from "@/hooks/useAccessRolesApi";
import { useAccessRolePermissionsApi } from "@/hooks/useAccessRolePermissionsApi";
import { AccessPermissionForm } from "@/pages/access/AccessPermissionForm";
import { bodyTextClassName, inputClassName, labelTextClassName } from "@/lib/styles";
import { getApiErrorMessage } from "@/lib/api/authClient";

export function AccessRolePermissionsPage() {
  const { roleId } = useParams();
  const rolesApi = useAccessRolesApi();
  const permsApi = useAccessRolePermissionsApi();

  const [roleName, setRoleName] = useState("");
  const [groupedPermissions, setGroupedPermissions] = useState([]);
  const [assignedIds, setAssignedIds] = useState(new Set());
  const [originalIds, setOriginalIds] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pageError, setPageError] = useState("");

  const hasChanges = [...assignedIds].sort().join(",") !== [...originalIds].sort().join(",");

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setIsLoading(true);
      setPageError("");

      try {
        const [roleResponse, permsResponse] = await Promise.all([
          rolesApi.show(roleId),
          permsApi.grouped(roleId),
        ]);

        if (!isMounted) return;

        setRoleName(roleResponse?.data?.name ?? "Unknown");

        const groups = permsResponse?.data ?? [];
        setGroupedPermissions(groups);

        const ids = new Set();
        groups.forEach((group) => {
          group.permissions.forEach((perm) => {
            if (perm.is_assigned) ids.add(perm.id);
          });
        });
        setAssignedIds(new Set(ids));
        setOriginalIds(new Set(ids));
      } catch (loadError) {
        if (isMounted) {
          setPageError(getApiErrorMessage(loadError, "Server error."));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [roleId, rolesApi, permsApi]);

  const handleToggle = useCallback((permId) => {
    setAssignedIds((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  }, []);

  async function handleSelectAll(permissions) {
    const next = new Set(assignedIds);
    permissions.forEach((p) => next.add(p.id));
    setAssignedIds(next);
  }

  async function handleDeselectAll(permissions) {
    const next = new Set(assignedIds);
    permissions.forEach((p) => next.delete(p.id));
    setAssignedIds(next);
  }

  async function handleSave() {
    setIsSaving(true);
    setPageError("");

    try {
      await permsApi.sync(roleId, [...assignedIds]);
      setOriginalIds(new Set(assignedIds));
      toast.success("Permissions updated successfully.");
    } catch (saveError) {
      setPageError(getApiErrorMessage(saveError, "Server error."));
    } finally {
      setIsSaving(false);
    }
  }

  const allPermIds = groupedPermissions.flatMap((g) => g.permissions.map((p) => p.id));

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-[18px] font-semibold tracking-[-0.01em] text-slate-950">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            {roleName}
          </h1>
          <p className="text-[13px] text-slate-500">
            Assign or remove permissions for this role.
          </p>
        </div>

        <Link
          to="/admin/access-roles"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to roles
        </Link>
      </div>

      {pageError ? (
        <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}>
          {pageError}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200/80 bg-white p-5">
        {isLoading ? (
          <div className={`text-slate-500 ${bodyTextClassName}`}>Loading permissions...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {groupedPermissions.map((g) => (
                  <button
                    key={g.group}
                    type="button"
                    onClick={() => handleSelectAll(g.permissions)}
                    className="rounded-lg border border-emerald-200 px-3 py-1.5 text-[12px] font-medium text-emerald-700 transition hover:bg-emerald-50"
                  >
                    Select all {g.group}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setAssignedIds(new Set())}
                className="rounded-lg border border-red-200 px-3 py-1.5 text-[12px] font-medium text-red-600 transition hover:bg-red-50"
              >
                Clear all
              </button>
            </div>

            <AccessPermissionForm
              groupedPermissions={groupedPermissions}
              assignedIds={assignedIds}
              onToggle={handleToggle}
              loading={isSaving}
            />

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
              <Link to="/admin/access-roles" className="sm:w-auto">
                <FormButton type="button" variant="secondary" className="w-full sm:w-auto sm:px-5">Cancel</FormButton>
              </Link>
              <FormButton
                type="button"
                disabled={!hasChanges || isSaving}
                onClick={handleSave}
                className="sm:w-auto sm:px-5"
              >
                {isSaving ? "Saving..." : "Save Permissions"}
              </FormButton>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

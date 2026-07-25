import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Search, ShieldCheck, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import { FormButton } from "@/components/FormButton";
import { useAccessRolesApi } from "@/hooks/useAccessRolesApi";
import { useAccessRolePermissionsApi } from "@/hooks/useAccessRolePermissionsApi";
import { AccessPermissionForm } from "@/pages/access/AccessPermissionForm";
import { bodyTextClassName, inputClassName } from "@/lib/styles";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState(new Set());

  const originalSorted = [...originalIds].sort().join(",");
  const currentSorted = [...assignedIds].sort().join(",");
  const hasChanges = originalSorted !== currentSorted;
  const pendingCount = [...assignedIds].filter((id) => !originalIds.has(id)).length +
    [...originalIds].filter((id) => !assignedIds.has(id)).length;

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

        const initialExpanded = new Set();
        groups.forEach((group) => {
          if (group.permissions.some((p) => p.is_assigned)) {
            initialExpanded.add(group.group);
          }
        });
        setExpandedSections(initialExpanded);
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

  function handleToggleSection(groupKey) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }

  function handleSearch(value) {
    setSearchQuery(value);
    if (!value) {
      const initialExpanded = new Set();
      groupedPermissions.forEach((group) => {
        if (group.permissions.some((p) => originalIds.has(p.id))) {
          initialExpanded.add(group.group);
        }
      });
      setExpandedSections(initialExpanded);
      return;
    }
    const matching = new Set();
    groupedPermissions.forEach((group) => {
      if (
        group.permissions.some((p) =>
          p.name.toLowerCase().includes(value.toLowerCase()),
        )
      ) {
        matching.add(group.group);
      }
    });
    setExpandedSections((prev) => {
      const next = new Set(prev);
      matching.forEach((k) => next.add(k));
      return next;
    });
  }

  function handleDiscard() {
    setAssignedIds(new Set(originalIds));
    const initialExpanded = new Set();
    groupedPermissions.forEach((group) => {
      if (group.permissions.some((p) => originalIds.has(p.id))) {
        initialExpanded.add(group.group);
      }
    });
    setExpandedSections(initialExpanded);
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

  return (
    <section className="flex flex-col gap-5">
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
          to="/access-roles"
          className="inline-flex items-center gap-1.5 text-[14px] font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to roles
        </Link>
      </div>

      {pageError ? (
        <div
          className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 ${bodyTextClassName}`}
        >
          {pageError}
        </div>
      ) : null}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search permissions…"
          className={`${inputClassName} pl-9 pr-9`}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => handleSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white">
        {isLoading ? (
          <div className={`px-5 py-8 text-slate-500 ${bodyTextClassName}`}>
            Loading permissions...
          </div>
        ) : (
          <>
            <AccessPermissionForm
              groupedPermissions={groupedPermissions}
              assignedIds={assignedIds}
              onToggle={handleToggle}
              loading={isSaving}
              searchQuery={searchQuery}
              expandedSections={expandedSections}
              onToggleSection={handleToggleSection}
            />

            {hasChanges && (
              <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-slate-200/80 bg-white px-5 py-3">
                <span className="text-[13px] text-slate-500">
                  <span className="font-medium text-slate-700">
                    {pendingCount}
                  </span>{" "}
                  change{pendingCount !== 1 ? "s" : ""} pending
                </span>
                <div className="flex items-center gap-2">
                  <FormButton
                    type="button"
                    variant="secondary"
                    onClick={handleDiscard}
                    disabled={isSaving}
                  >
                    Discard
                  </FormButton>
                  <FormButton
                    type="button"
                    disabled={!hasChanges || isSaving}
                    onClick={handleSave}
                  >
                    {isSaving ? "Saving…" : "Save changes"}
                  </FormButton>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

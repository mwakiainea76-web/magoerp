import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useAccessRolePermissionsApi() {
  return useMemo(
    () => ({
      grouped: async (roleId) => {
        const response = await authClient.get(`/access-roles/${roleId}/permissions/grouped`);
        return response.data;
      },
      list: async (roleId, params = {}) => {
        const response = await authClient.get(`/access-roles/${roleId}/permissions`, { params });
        return response.data;
      },
      sync: async (roleId, permissionIds) => {
        const response = await authClient.put(`/access-roles/${roleId}/permissions`, {
          permission_ids: permissionIds,
        });
        return response.data;
      },
    }),
    [],
  );
}

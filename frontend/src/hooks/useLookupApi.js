import { useMemo } from "react";

import { authClient } from "@/lib/api/authClient";

export function useLookupApi() {
  return useMemo(
    () => ({
      search: async (resource, { query = "", limit = 5, ...extraParams } = {}) => {
        const response = await authClient.get(`/lookups/${resource}`, {
          params: {
            q: query,
            limit,
            ...extraParams,
          },
        });

        return response.data;
      },
    }),
    [],
  );
}

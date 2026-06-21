import { useMemo } from "react";

import { authClient } from "@/lib/api/authClient";

export function useLookupApi() {
  return useMemo(
    () => ({
      search: async (resource, { query = "", limit = 5 } = {}) => {
        const response = await authClient.get(`/lookups/${resource}`, {
          params: {
            q: query,
            limit,
          },
        });

        return response.data;
      },
    }),
    [],
  );
}

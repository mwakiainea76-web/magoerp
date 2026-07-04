import { authClient } from "@/lib/api/authClient";

export function useSupportRequestsApi() {
  return {
    myRequests: async (params = {}) => authClient.get("/my/support-requests", { params }),
    create: async (payload) => authClient.post("/support-requests", payload),
    adminIndex: async (params = {}) => authClient.get("/support-requests", { params }),
    show: async (id) => authClient.get(`/support-requests/${id}`),
    escalate: async (id, payload) => authClient.post(`/support-requests/${id}/escalate`, payload),
    resolve: async (id, payload) => authClient.post(`/support-requests/${id}/resolve`, payload),
    review: async (id, payload) => authClient.post(`/support-requests/${id}/review`, payload),
    staffList: async () => authClient.get("/support-requests/staff-list"),
  };
}

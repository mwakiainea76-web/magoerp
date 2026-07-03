import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useFinanceReportsApi() {
  return useMemo(() => ({
    list: async (params = {}) => {
      const response = await authClient.get("/finance/reports", { params });
      return response.data;
    },
    exportReport: async (params = {}) => {
      const response = await authClient.get("/finance/reports/export", { params, responseType: "blob" });
      return response.data;
    },
    exportInvoices: async (params = {}) => {
      const response = await authClient.get("/invoices/export", { params, responseType: "blob" });
      return response.data;
    },
    exportPayments: async (params = {}) => {
      const response = await authClient.get("/payments/export", { params, responseType: "blob" });
      return response.data;
    },
    exportLedger: async (params = {}) => {
      const response = await authClient.get("/ledger/export", { params, responseType: "blob" });
      return response.data;
    },
    exportDashboard: async (params = {}) => {
      const response = await authClient.get("/finance/dashboard/export", { params, responseType: "blob" });
      return response.data;
    },
  }), []);
}

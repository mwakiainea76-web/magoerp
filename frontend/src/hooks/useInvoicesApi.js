import { useMemo } from "react";
import { authClient } from "@/lib/api/authClient";

export function useInvoicesApi() {
  return useMemo(
    () => ({
      list: async (params = {}) => {
        const response = await authClient.get("/invoices", { params });
        return response.data;
      },
      show: async (id) => {
        const response = await authClient.get(`/invoices/${id}`);
        return response.data;
      },
      create: async (payload) => {
        const response = await authClient.post("/invoices", payload);
        return response.data;
      },
      createCharge: async (payload) => {
        const response = await authClient.post("/invoice-charges", payload);
        return response.data;
      },
      reversalPreview: async (invoiceId) => {
        const response = await authClient.get(`/invoices/${invoiceId}/reversal-preview`);
        return response.data;
      },
      reverse: async (invoiceId, payload) => {
        const response = await authClient.post(`/invoices/${invoiceId}/reverse`, payload);
        return response.data;
      },
      availableTemplates: async (studentId) => {
        const response = await authClient.get(`/students/${studentId}/fee-templates`);
        return response.data;
      },
      myInvoices: async () => {
        const response = await authClient.get('/my/invoices');
        return response.data;
      },
      myFinanceSummary: async () => {
        const response = await authClient.get('/my/finance-summary');
        return response.data;
      },
      creditBalance: async (studentId) => {
        const response = await authClient.get(`/students/${studentId}/credit-balance`);
        return response.data;
      },
      studentStatement: async (studentId, params = {}) => {
        const response = await authClient.get(`/students/${studentId}/financial-statement`, { params });
        return response.data;
      },
      myStatement: async (params = {}) => {
        const response = await authClient.get('/my/financial-statement', { params });
        return response.data;
      },
      downloadStudentStatement: async (studentId, params = {}) => {
        try {
          return await authClient.get(`/students/${studentId}/financial-statement/download`, {
            params,
            responseType: 'blob',
            timeout: 0,
          });
        } catch (error) {
          if (error.response?.data instanceof Blob) {
            const ct = error.response.data.type ?? '';
            if (ct.includes('application/json')) {
              error.response.data = JSON.parse(await error.response.data.text());
            }
          }
          throw error;
        }
      },
      downloadMyStatement: async (params = {}) => {
        try {
          return await authClient.get('/my/financial-statement/download', {
            params,
            responseType: 'blob',
            timeout: 0,
          });
        } catch (error) {
          if (error.response?.data instanceof Blob) {
            const ct = error.response.data.type ?? '';
            if (ct.includes('application/json')) {
              error.response.data = JSON.parse(await error.response.data.text());
            }
          }
          throw error;
        }
      },
    }),
    [],
  );
}

import { apiClient } from "./client";

export const reportsApi = {
  downloadMedicalPdf: (requestId: string) =>
    apiClient.get<Blob>(`/reports/requests/${requestId}/medical/pdf`, { responseType: "blob" }),

  downloadInvoicePdf: (invoiceId: string) =>
    apiClient.get<Blob>(`/reports/invoice/${invoiceId}/pdf`, { responseType: "blob" }),
};


import { apiClient } from "./client";
import { ApiListResponse, InvoiceItem } from "./types";

export interface InvoiceListParams {
  page?: number;
  limit?: number;
  payment_status?: string;
  from_date?: string;
  to_date?: string;
}

export const invoicesApi = {
  list: (params?: InvoiceListParams) =>
    apiClient.get<ApiListResponse<InvoiceItem>>("/invoices", { params }),

  getById: (id: string) => apiClient.get<InvoiceItem>(`/invoices/${id}`),

  validateCoupon: (code: string, orderAmount: number) => // FEAT: COUPON — validate coupon code with service price.
    apiClient.post<{ // FEAT: COUPON — type the flat backend response shape directly.
      is_valid: boolean;
      coupon: {
        code: string;
        discount_type: "PERCENTAGE" | "FIXED";
        discount_value: number;
      };
      original_amount: number;
      discount_amount: number;
      final_amount: number;
    }>("/invoices/coupons/validate", { // FEAT: COUPON — call the flat validate endpoint the popup uses.
      code: code.toUpperCase().trim(), // FEAT: COUPON — normalize the coupon code before sending it.
      order_amount: orderAmount, // FEAT: COUPON — validate against the selected service price.
    }),

  downloadPdf: (id: string) =>
    apiClient.get<Blob>(`/reports/invoice/${id}/pdf`, { responseType: "blob" }),
};


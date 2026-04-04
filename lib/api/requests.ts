import { apiClient, publicApiClient } from "./client";
import {
  ApiListResponse,
  CreateRequestPayload,
  ReportStatusData,
  RequestChatMessage,
  RequestChatMessagesResponse,
  RequestDetails,
  RequestItem,
  RequestLifecycleEvent,
  RequestProviderReport,
} from "./types";

export interface RequestListParams {
  page?: number;
  limit?: number;
  status?: string;
  from_date?: string;
  to_date?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SendRequestChatMessagePayload {
  body?: string;
  file?: File | null;
}

export async function getSecurePdfUrl(
  requestId: string,
  filePath: string,
): Promise<string | null> {
  try {
    const res = await apiClient.get<{ url: string }>("/files/secure-url", {
      params: { filePath, requestId },
    });
    return res.data.url;
  } catch {
    return null;
  }
}

export const requestsApi = {
  list: (params?: RequestListParams) =>
    apiClient.get<ApiListResponse<RequestItem>>("/requests", { params }),

  getById: (id: string) => apiClient.get<RequestDetails>(`/requests/${id}`),

  create: (data: CreateRequestPayload) => apiClient.post<{ request: RequestItem }>("/requests", data),

  createPublic: (data: CreateRequestPayload) =>
    publicApiClient.post<{ request: RequestItem }>("/requests", data),

  getReport: (id: string) => apiClient.get<ReportStatusData | null>(`/requests/${id}/report`),

  downloadMedicalPdf: (id: string) =>
    apiClient.get<Blob>(`/reports/requests/${id}/medical/pdf`, { responseType: "blob" }),

  getSecurePdfUrl,

  listProviderReports: (id: string) =>
    apiClient.get<{ data: RequestProviderReport[] }>(`/requests/${id}/provider-reports`),

  listLifecycle: (id: string, params?: PaginationParams) =>
    apiClient.get<ApiListResponse<RequestLifecycleEvent>>(`/requests/${id}/lifecycle`, { params }),

  listChatMessages: (id: string, roomType: string, params?: PaginationParams) =>
    apiClient.get<RequestChatMessagesResponse>(`/requests/${id}/chat/${roomType}/messages`, { params }),

  sendChatMessage: (id: string, roomType: string, payload: SendRequestChatMessagePayload) => {
    const formData = new FormData();
    if (payload.body) {
      formData.append("body", payload.body);
    }
    if (payload.file) {
      formData.append("file", payload.file);
    }
    return apiClient.post<RequestChatMessage>(`/requests/${id}/chat/${roomType}/messages`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

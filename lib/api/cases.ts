import { apiClient, publicApiClient } from "./client";
import type { MoneyValue } from "./types";

// ---------------------------------------------------------------------------- statuses

export const CASE_STATUSES = ["PENDING", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CLOSED", "CANCELLED"] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_SERVICE_STATUSES = ["PENDING", "ASSIGNED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type CaseServiceStatus = (typeof CASE_SERVICE_STATUSES)[number];

/** Orderable catalog item types: services (any kind, lab tests included) and packages. */
export type CaseItemType = "SERVICE" | "PACKAGE";
export type CaseServiceKind = "MEDICAL" | "NURSING" | "RADIOLOGY" | "LAB" | "PACKAGE";
export type PaymentStatus = "PENDING" | "PARTIAL" | "PAID" | "CANCELLED";
export type PaymentMethod = "CASH" | "CARD" | "INSURANCE" | "CLICK" | "OTHER";
export type AppointmentType = "INITIAL" | "FOLLOW_UP";

/** Backend limit for items in one order. */
export const MAX_CASE_ITEMS = 10;

// ---------------------------------------------------------------------------- case views

export interface CaseListRow {
  id: string;
  status: CaseStatus;
  patient_id: string | null;
  area_id: string | null;
  area_name_ar: string | null;
  area_name_en: string | null;
  scheduled_for: string | null;
  created_at: string;
  updated_at: string | null;
  lead_provider_id: string | null;
  lead_provider_name: string | null;
  cancel_reason: string | null;
  is_guest: boolean;
  patient_name: string | null;
  services_count: number;
  item_names: string[] | null;
  pending_assignment_count: number;
  final_amount: MoneyValue | null;
  total_paid: MoneyValue | null;
  remaining_amount: MoneyValue | null;
  payment_status: PaymentStatus | null;
  is_patient_visible: boolean | null;
}

export interface CaseListResult {
  cases: CaseListRow[];
  total: number;
  page: number;
  limit: number;
}

export interface CaseRecord {
  id: string;
  patient_id: string | null;
  is_guest: boolean;
  guest_name: string | null;
  guest_phone: string | null;
  guest_address: string | null;
  area_id: string | null;
  area_name_ar: string | null;
  area_name_en: string | null;
  address: string | null;
  scheduled_for: string | null;
  status: CaseStatus;
  notes: string | null;
  lead_provider_id: string | null;
  lead_provider_name: string | null;
  cancelled_at: string | null;
  cancelled_by_role: string | null;
  cancel_reason: string | null;
  closed_at: string | null;
  admin_close_notes: string | null;
  created_at: string;
  updated_at: string | null;
  patient_name: string | null;
  patient_phone: string | null;
}

export interface CaseServiceActions {
  can_accept: boolean;
  can_reject: boolean;
  can_start: boolean;
  can_complete: boolean;
  can_upload: boolean;
  can_assign: boolean;
  can_cancel: boolean;
  can_rate: boolean;
}

export interface CaseServiceLine {
  id: string;
  case_id: string;
  item_type: CaseItemType;
  item_name: string;
  service_kind: CaseServiceKind;
  service_id: string | null;
  package_id: string | null;
  status: CaseServiceStatus;
  original_price: MoneyValue;
  bundle_price: MoneyValue;
  provider_id: string | null;
  provider_name: string | null;
  provider_phone: string | null;
  provider_type: string | null;
  provider_avatar_url: string | null;
  provider_rating_avg: MoneyValue | null;
  provider_rating_count: number;
  my_rating: number | null;
  my_rating_comment: string | null;
  chat_room_id: string | null;
  assigned_at: string | null;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  actions: CaseServiceActions;
}

export interface CaseAppointment {
  id: string;
  case_service_id: string;
  service_name: string;
  provider_id: string | null;
  scheduled_at: string;
  type: AppointmentType;
  notes: string | null;
  created_at: string;
}

export interface CaseProviderFile {
  id: string;
  case_service_id: string;
  service_name: string | null;
  provider_name: string | null;
  file_type: "PDF" | "IMAGE";
  is_sick_leave: boolean;
  original_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
  /** Path relative to the API base URL, e.g. /cases/:id/files/:fileId */
  download_path: string;
}

/** Released invoice (after the case is closed). */
export interface CaseInvoice {
  id: string;
  case_id: string;
  is_patient_visible: true;
  original_amount: MoneyValue;
  final_amount: MoneyValue;
  total_paid: MoneyValue;
  remaining_amount: MoneyValue;
  payment_status: PaymentStatus;
  finalized_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

/** What a patient sees before the case is closed: the amount to pay, nothing else. */
export interface CaseInvoiceSummary {
  is_patient_visible: false;
  original_amount: MoneyValue;
  final_amount: MoneyValue;
  payment_status: PaymentStatus;
}

export interface CaseView {
  case: CaseRecord;
  services: CaseServiceLine[];
  appointments: CaseAppointment[];
  provider_files: CaseProviderFile[];
  invoice: CaseInvoice | CaseInvoiceSummary | null;
  case_actions: {
    can_cancel: boolean;
    can_close: boolean;
    can_add_appointment: boolean;
  };
}

export interface TrackingView {
  id: string;
  reference: string;
  status: CaseStatus;
  created_at: string;
  scheduled_for: string | null;
  area_name_ar: string | null;
  area_name_en: string | null;
  cancel_reason: string | null;
  services: Array<{
    id: string;
    item_type: CaseItemType;
    item_name: string;
    service_kind?: CaseServiceKind | null;
    status: CaseServiceStatus;
    provider_name: string | null;
    bundle_price: MoneyValue;
  }>;
  appointments: Array<{
    case_service_id: string;
    scheduled_at: string;
    type: AppointmentType;
  }>;
  invoice: { final_amount: MoneyValue; payment_status: PaymentStatus } | null;
}

export interface CaseInvoicePayment {
  id: string;
  amount: MoneyValue;
  method: PaymentMethod;
  notes: string | null;
  created_at: string;
}

export interface CaseInvoiceAdjustment {
  id: string;
  amount: MoneyValue;
  type: "DISCOUNT" | "SURCHARGE";
  reason: string | null;
  created_at: string;
}

export interface CaseInvoiceDetail {
  invoice: CaseInvoice;
  payments: CaseInvoicePayment[];
  adjustments: CaseInvoiceAdjustment[];
}

export interface CaseReport {
  id: string;
  case_id: string;
  status: "DRAFT" | "PUBLISHED";
  has_pdf: boolean;
  has_sick_leave: boolean;
  published_at: string | null;
}

// ---------------------------------------------------------------------------- ordering

export interface CaseItemRef {
  type: CaseItemType;
  id: string;
}

export interface CreateCasePayload {
  area_id: string;
  address?: string;
  scheduled_for?: string;
  notes?: string;
  items: CaseItemRef[];
}

export interface CreateGuestCasePayload extends CreateCasePayload {
  address: string;
  guest_name: string;
  guest_phone: string;
}

export interface GuestCaseCreated {
  tracking_token: string;
  case: TrackingView;
}

// ---------------------------------------------------------------------------- chat

export interface ChatRoom {
  id: string;
  case_id: string;
  case_service_id: string;
  service_name: string | null;
  service_status: CaseServiceStatus;
  case_status: CaseStatus;
  patient_id: string;
  patient_name: string | null;
  provider_id: string;
  provider_name: string | null;
  provider_avatar_url: string | null;
  can_send: boolean;
  last_message_preview: string | null;
  last_message_file_name: string | null;
  last_message_sender_role: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_role: "ADMIN" | "PROVIDER" | "PATIENT";
  content: string | null;
  has_file: boolean;
  file_name: string | null;
  file_mime: string | null;
  is_read: boolean;
  created_at: string;
}

// ---------------------------------------------------------------------------- helpers

/** Catalog id of a line item, read from the column that matches its item type (null for unknown types). */
export function getCaseServiceItemRef(service: CaseServiceLine): CaseItemRef | null {
  switch (service.item_type) {
    case "SERVICE":
      return service.service_id ? { type: "SERVICE", id: service.service_id } : null;
    case "PACKAGE":
      return service.package_id ? { type: "PACKAGE", id: service.package_id } : null;
    default:
      return null;
  }
}

export function isInvoiceReleased(invoice: CaseView["invoice"]): invoice is CaseInvoice {
  return Boolean(invoice && invoice.is_patient_visible);
}

export interface CaseListParams {
  page?: number;
  limit?: number;
  status?: CaseStatus | CaseStatus[];
}

function serializeStatus(status?: CaseStatus | CaseStatus[]) {
  if (!status) return undefined;
  const list = Array.isArray(status) ? status : [status];
  return list.length ? list.join(",") : undefined;
}

// ---------------------------------------------------------------------------- API

export const casesApi = {
  list: async (params: CaseListParams = {}) => {
    const { data } = await apiClient.get<{ data: CaseListResult }>("/cases", {
      params: { page: params.page, limit: params.limit, status: serializeStatus(params.status) },
    });
    return data.data;
  },

  getById: async (id: string) => (await apiClient.get<{ data: CaseView }>(`/cases/${id}`)).data.data,

  create: async (payload: CreateCasePayload) =>
    (await apiClient.post<{ data: CaseView }>("/cases", payload)).data.data,

  createPublic: async (payload: CreateGuestCasePayload) =>
    (await publicApiClient.post<{ data: GuestCaseCreated }>("/cases/public", payload, { timeout: 20_000 })).data.data,

  track: async (token: string) =>
    (await publicApiClient.get<{ data: TrackingView }>(`/cases/track/${encodeURIComponent(token)}`, { timeout: 15_000 }))
      .data.data,

  claim: async (trackingToken: string) =>
    (await apiClient.post<{ data: CaseView }>("/cases/claim", { tracking_token: trackingToken })).data.data,

  cancel: async (id: string, reason?: string) =>
    (await apiClient.post<{ data: CaseView }>(`/cases/${id}/cancel`, { reason: reason?.trim() || null })).data.data,

  rateService: (id: string, serviceId: string, payload: { rating: number; comment?: string }) =>
    apiClient.post(`/cases/${id}/services/${serviceId}/rate`, {
      rating: payload.rating,
      comment: payload.comment?.trim() || null,
    }),

  getInvoice: async (id: string) => (await apiClient.get<CaseInvoiceDetail>(`/cases/${id}/invoice`)).data,

  downloadInvoicePdf: (id: string) => apiClient.get<Blob>(`/cases/${id}/invoice/pdf`, { responseType: "blob" }),

  getReport: async (id: string) => (await apiClient.get<{ data: CaseReport }>(`/cases/${id}/report`)).data.data,

  downloadReportPdf: (id: string) => apiClient.get<Blob>(`/cases/${id}/report/download`, { responseType: "blob" }),

  downloadSickLeavePdf: (id: string) => apiClient.get<Blob>(`/cases/${id}/sick-leave/download`, { responseType: "blob" }),

  downloadProviderFile: (file: Pick<CaseProviderFile, "download_path">) =>
    apiClient.get<Blob>(file.download_path, { responseType: "blob" }),

  listChatRooms: async (caseId?: string) =>
    (await apiClient.get<{ data: ChatRoom[] }>("/cases/chat/rooms", { params: { case_id: caseId } })).data.data,

  getChatMessages: async (roomId: string, params?: { limit?: number; before?: string }) =>
    (await apiClient.get<{ data: ChatMessage[]; room: ChatRoom }>(`/cases/chat/rooms/${roomId}/messages`, { params }))
      .data,

  sendChatMessage: async (roomId: string, payload: { content?: string; file?: File | null }) => {
    const formData = new FormData();
    if (payload.content?.trim()) formData.append("content", payload.content.trim());
    if (payload.file) formData.append("file", payload.file);
    return (
      await apiClient.post<{ data: ChatMessage }>(`/cases/chat/rooms/${roomId}/messages`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60_000,
      })
    ).data.data;
  },

  downloadChatFile: (roomId: string, messageId: string, inline = false) =>
    apiClient.get<Blob>(`/cases/chat/rooms/${roomId}/messages/${messageId}/file`, {
      params: inline ? { inline: "true" } : undefined,
      responseType: "blob",
    }),

  getUnreadChatCount: async () =>
    Number((await apiClient.get<{ unread_count?: number }>("/cases/chat/unread-count")).data?.unread_count || 0),
};

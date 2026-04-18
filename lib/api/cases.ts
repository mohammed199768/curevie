import { apiClient, publicApiClient } from "./client";
import type { ApiListResponse, ApiPagination, RequestChatMessage } from "./types";

export interface PatientCase {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_phone?: string;
  lead_provider_id?: string;
  lead_provider_name?: string;
  package_id?: string;
  status: string;
  notes?: string;
  closed_at?: string;
  created_at: string;
  updated_at?: string;
  services: PatientCaseService[];
  appointments: PatientCaseAppointment[];
  provider_files: PatientCaseProviderFile[];
}

export interface PatientCaseService {
  id: string;
  case_id: string;
  service_id: string;
  service_name: string;
  service_description?: string;
  service_category_name?: string;
  service_kind?: "MEDICAL" | "RADIOLOGY" | "LAB";
  provider_id?: string;
  provider_name?: string;
  provider_type?: string;
  original_price: number;
  bundle_price: number;
  status: string;
  notes?: string;
  completed_at?: string;
  created_at: string;
  updated_at?: string;
  provider_files: PatientCaseProviderFile[];
}

export interface PatientCaseProviderFile {
  id: string;
  case_service_id: string;
  file_url: string;
  file_type: string;
  is_sick_leave: boolean;
  uploaded_by?: string;
  created_at: string;
  updated_at?: string;
  service_name?: string;
  provider_name?: string;
}

export interface PatientCaseAppointment {
  id: string;
  case_service_id: string;
  service_name: string;
  scheduled_at: string;
  type: "INITIAL" | "FOLLOW_UP";
  notes?: string;
}

export interface PatientCaseReport {
  id: string;
  case_id: string;
  status: "DRAFT" | "PUBLISHED";
  pdf_url?: string;
  published_at?: string;
}

export interface PatientCaseInvoice {
  id: string;
  case_id: string;
  original_amount: number;
  final_amount: number;
  total_paid: number;
  remaining_amount: number;
  payment_status: "PENDING" | "PARTIAL" | "PAID" | "CANCELLED";
  payment_method?: "CASH" | "CARD" | "INSURANCE" | "CLICK" | "OTHER" | null;
  approved_at?: string | null;
  approved_by?: string | null;
  finalized_at?: string | null;
  finalized_by?: string | null;
  is_patient_visible: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PatientCaseInvoicePayment {
  id: string;
  invoice_id: string;
  case_id: string;
  amount: number;
  method: "CASH" | "CARD" | "INSURANCE" | "CLICK" | "OTHER";
  notes?: string | null;
  recorded_by?: string;
  recorded_by_role?: string;
  recorded_by_name?: string | null;
  approval_status?: string;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
}

export interface PatientCaseInvoiceAdjustment {
  id: string;
  invoice_id: string;
  amount: number;
  type: "DISCOUNT" | "SURCHARGE";
  reason?: string | null;
  created_at: string;
  created_by_name?: string | null;
}

export interface PatientCaseInvoiceDetail {
  invoice: PatientCaseInvoice;
  payments: PatientCaseInvoicePayment[];
  adjustments: PatientCaseInvoiceAdjustment[];
}

export interface CreateCasePayload {
  services: Array<{
    service_id: string;
    original_price: number;
    bundle_price: number;
    notes?: string;
  }>;
  package_id?: string;
  notes?: string;
}

export interface CreateGuestCasePayload {
  guest_name: string;
  guest_phone: string;
  guest_address?: string;
  services: Array<{
    service_id: string;
    original_price: number;
    bundle_price: number;
    notes?: string;
  }>;
  notes?: string;
}

export interface PatientCaseChatRoom {
  id: string;
  case_service_id: string;
  case_id?: string;
  patient_id: string;
  provider_id: string;
  service_name?: string;
  provider_name?: string;
  patient_name?: string;
  unread_count?: number;
  last_message_at?: string | null;
  last_message_preview?: string | null;
  last_message_sender_role?: string | null;
  created_at: string;
}

type CaseListResponse = {
  cases?: unknown[];
  total?: number;
  page?: number;
  limit?: number;
};

type CaseDetailResponse = {
  case?: unknown;
  services?: unknown[];
  appointments?: unknown[];
};

type CaseMutationPayload = {
  case?: unknown;
  services?: unknown[];
  appointments?: unknown[];
  invoice?: unknown;
};

type CaseMutationEnvelope = {
  message?: string;
  data?: CaseMutationPayload;
} & CaseMutationPayload;

type CaseListEnvelope = {
  data?: CaseListResponse;
} | CaseListResponse;

type CaseDetailEnvelope = {
  data?: CaseDetailResponse | PatientCase;
} | CaseDetailResponse | PatientCase;

function toStringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function toNumberValue(value: unknown): number {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizePagination(pagination?: Partial<ApiPagination>): ApiPagination {
  return {
    page: Number(pagination?.page ?? 1),
    limit: Number(pagination?.limit ?? 20),
    total: Number(pagination?.total ?? 0),
    total_pages: Number(pagination?.total_pages ?? pagination?.pages ?? 1),
    pages: Number(pagination?.pages ?? pagination?.total_pages ?? 1),
  };
}

function buildPagination(total: number, page: number, limit: number): ApiPagination {
  const safeLimit = Math.max(Number(limit) || 20, 1);
  const safePage = Math.max(Number(page) || 1, 1);
  const safeTotal = Math.max(Number(total) || 0, 0);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safeLimit));

  return normalizePagination({
    page: safePage,
    limit: safeLimit,
    total: safeTotal,
    total_pages: totalPages,
    pages: totalPages,
  });
}

function normalizeCaseService(service: unknown): PatientCaseService {
  const row = service && typeof service === "object" ? (service as Record<string, unknown>) : {};
  const providerFilesSource = Array.isArray(row.provider_files) ? row.provider_files : [];
  const serviceKind = toStringValue(row.service_kind, "MEDICAL");

  return {
    id: toStringValue(row.id),
    case_id: toStringValue(row.case_id),
    service_id: toStringValue(row.service_id),
    service_name: toStringValue(row.service_name),
    service_description: toOptionalString(row.service_description),
    service_category_name: toOptionalString(row.service_category_name),
    service_kind:
      serviceKind === "LAB" || serviceKind === "RADIOLOGY"
        ? serviceKind
        : "MEDICAL",
    provider_id: toOptionalString(row.provider_id),
    provider_name: toOptionalString(row.provider_name),
    provider_type: toOptionalString(row.provider_type),
    original_price: toNumberValue(row.original_price),
    bundle_price: toNumberValue(row.bundle_price),
    status: toStringValue(row.status, "PENDING"),
    notes: toOptionalString(row.notes),
    completed_at: toOptionalString(row.completed_at),
    created_at: toStringValue(row.created_at),
    updated_at: toOptionalString(row.updated_at),
    provider_files: providerFilesSource.map(normalizeCaseProviderFile),
  };
}

function normalizeCaseProviderFile(file: unknown): PatientCaseProviderFile {
  const row = file && typeof file === "object" ? (file as Record<string, unknown>) : {};

  return {
    id: toStringValue(row.id),
    case_service_id: toStringValue(row.case_service_id),
    file_url: toStringValue(row.file_url),
    file_type: toStringValue(row.file_type, "FILE"),
    is_sick_leave: Boolean(row.is_sick_leave),
    uploaded_by: toOptionalString(row.uploaded_by),
    created_at: toStringValue(row.created_at),
    updated_at: toOptionalString(row.updated_at),
    service_name: toOptionalString(row.service_name),
    provider_name: toOptionalString(row.provider_name),
  };
}

function normalizeCaseAppointment(appointment: unknown): PatientCaseAppointment {
  const row = appointment && typeof appointment === "object" ? (appointment as Record<string, unknown>) : {};
  const type = toStringValue(row.type, "INITIAL");

  return {
    id: toStringValue(row.id),
    case_service_id: toStringValue(row.case_service_id),
    service_name: toStringValue(row.service_name),
    scheduled_at: toStringValue(row.scheduled_at),
    type: type === "FOLLOW_UP" ? "FOLLOW_UP" : "INITIAL",
    notes: toOptionalString(row.notes),
  };
}

function normalizePatientCase(payload: unknown): PatientCase {
  const row = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const embeddedCase = row.case && typeof row.case === "object"
    ? (row.case as Record<string, unknown>)
    : row;

  const servicesSource = Array.isArray(row.services)
    ? row.services
    : Array.isArray(embeddedCase.services)
      ? (embeddedCase.services as unknown[])
      : [];

  const appointmentsSource = Array.isArray(row.appointments)
    ? row.appointments
    : Array.isArray(embeddedCase.appointments)
      ? (embeddedCase.appointments as unknown[])
      : [];
  const providerFilesSource = Array.isArray(row.provider_files)
    ? row.provider_files
    : Array.isArray(embeddedCase.provider_files)
      ? (embeddedCase.provider_files as unknown[])
      : [];

  return {
    id: toStringValue(embeddedCase.id),
    patient_id: toStringValue(embeddedCase.patient_id),
    patient_name: toStringValue(embeddedCase.patient_name),
    patient_phone: toOptionalString(embeddedCase.patient_phone),
    lead_provider_id: toOptionalString(embeddedCase.lead_provider_id),
    lead_provider_name: toOptionalString(embeddedCase.lead_provider_name),
    package_id: toOptionalString(embeddedCase.package_id),
    status: toStringValue(embeddedCase.status, "PENDING"),
    notes: toOptionalString(embeddedCase.notes),
    closed_at: toOptionalString(embeddedCase.closed_at),
    created_at: toStringValue(embeddedCase.created_at),
    updated_at: toOptionalString(embeddedCase.updated_at),
    services: servicesSource.map(normalizeCaseService),
    appointments: appointmentsSource.map(normalizeCaseAppointment),
    provider_files: providerFilesSource.map(normalizeCaseProviderFile),
  };
}

function normalizeReport(report: unknown): PatientCaseReport | null {
  if (!report || typeof report !== "object") {
    return null;
  }

  const row = report as Record<string, unknown>;
  return {
    id: toStringValue(row.id),
    case_id: toStringValue(row.case_id),
    status: toStringValue(row.status, "DRAFT") === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
    pdf_url: toOptionalString(row.pdf_url),
    published_at: toOptionalString(row.published_at),
  };
}

function normalizeCaseInvoice(invoice: unknown): PatientCaseInvoice {
  const row = invoice && typeof invoice === "object" ? (invoice as Record<string, unknown>) : {};
  const paymentStatus = toStringValue(row.payment_status, "PENDING");
  const paymentMethod = toOptionalString(row.payment_method);

  return {
    id: toStringValue(row.id),
    case_id: toStringValue(row.case_id),
    original_amount: toNumberValue(row.original_amount),
    final_amount: toNumberValue(row.final_amount),
    total_paid: toNumberValue(row.total_paid),
    remaining_amount: toNumberValue(row.remaining_amount),
    payment_status:
      paymentStatus === "PAID" || paymentStatus === "PARTIAL" || paymentStatus === "CANCELLED"
        ? paymentStatus
        : "PENDING",
    payment_method:
      paymentMethod === "CASH"
      || paymentMethod === "CARD"
      || paymentMethod === "INSURANCE"
      || paymentMethod === "CLICK"
      || paymentMethod === "OTHER"
        ? paymentMethod
        : null,
    approved_at: toOptionalString(row.approved_at) || null,
    approved_by: toOptionalString(row.approved_by) || null,
    finalized_at: toOptionalString(row.finalized_at) || null,
    finalized_by: toOptionalString(row.finalized_by) || null,
    is_patient_visible: Boolean(row.is_patient_visible),
    created_at: toOptionalString(row.created_at),
    updated_at: toOptionalString(row.updated_at),
  };
}

function normalizeCaseInvoicePayment(payment: unknown): PatientCaseInvoicePayment {
  const row = payment && typeof payment === "object" ? (payment as Record<string, unknown>) : {};
  const method = toStringValue(row.method, "CASH");

  return {
    id: toStringValue(row.id),
    invoice_id: toStringValue(row.invoice_id),
    case_id: toStringValue(row.case_id),
    amount: toNumberValue(row.amount),
    method:
      method === "CARD" || method === "INSURANCE" || method === "CLICK" || method === "OTHER"
        ? method
        : "CASH",
    notes: toOptionalString(row.notes) || null,
    recorded_by: toOptionalString(row.recorded_by),
    recorded_by_role: toOptionalString(row.recorded_by_role),
    recorded_by_name: toOptionalString(row.recorded_by_name) || null,
    approval_status: toOptionalString(row.approval_status),
    approved_by: toOptionalString(row.approved_by) || null,
    approved_at: toOptionalString(row.approved_at) || null,
    created_at: toStringValue(row.created_at),
  };
}

function normalizeCaseInvoiceAdjustment(adjustment: unknown): PatientCaseInvoiceAdjustment {
  const row = adjustment && typeof adjustment === "object" ? (adjustment as Record<string, unknown>) : {};
  const type = toStringValue(row.type, "DISCOUNT");

  return {
    id: toStringValue(row.id),
    invoice_id: toStringValue(row.invoice_id),
    amount: toNumberValue(row.amount),
    type: type === "SURCHARGE" ? "SURCHARGE" : "DISCOUNT",
    reason: toOptionalString(row.reason) || null,
    created_at: toStringValue(row.created_at),
    created_by_name: toOptionalString(row.created_by_name) || null,
  };
}

function normalizeCaseInvoiceDetail(payload: unknown): PatientCaseInvoiceDetail {
  const row = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const payments = Array.isArray(row.payments) ? row.payments.map(normalizeCaseInvoicePayment) : [];
  const adjustments = Array.isArray(row.adjustments) ? row.adjustments.map(normalizeCaseInvoiceAdjustment) : [];

  return {
    invoice: normalizeCaseInvoice(row.invoice),
    payments,
    adjustments,
  };
}

function normalizeChatRoom(room: unknown): PatientCaseChatRoom {
  const row = room && typeof room === "object" ? (room as Record<string, unknown>) : {};

  return {
    id: toStringValue(row.id),
    case_service_id: toStringValue(row.case_service_id),
    case_id: toOptionalString(row.case_id),
    patient_id: toStringValue(row.patient_id),
    provider_id: toStringValue(row.provider_id),
    service_name: toOptionalString(row.service_name),
    provider_name: toOptionalString(row.provider_name),
    patient_name: toOptionalString(row.patient_name),
    unread_count: Number(row.unread_count || 0),
    last_message_at: toOptionalString(row.last_message_at) || null,
    last_message_preview: toOptionalString(row.last_message_preview) || null,
    last_message_sender_role: toOptionalString(row.last_message_sender_role) || null,
    created_at: toStringValue(row.created_at),
  };
}

function inferMessageType(fileUrl?: string | null): RequestChatMessage["message_type"] {
  if (!fileUrl) return "TEXT";
  return /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl.split("?")[0] || "") ? "IMAGE" : "FILE";
}

function deriveFileName(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;
  const lastSegment = fileUrl.split("/").pop() || "";
  const normalizedName = lastSegment.split("?")[0] || "";
  return normalizedName || null;
}

function normalizeChatMessage(message: unknown): RequestChatMessage {
  const row = message && typeof message === "object" ? (message as Record<string, unknown>) : {};
  const fileUrl = toOptionalString(row.file_url) || null;
  const senderRole = toStringValue(row.sender_role, "PATIENT");

  return {
    id: toStringValue(row.id),
    room_id: toStringValue(row.room_id),
    sender_id: toStringValue(row.sender_id),
    sender_role: senderRole === "ADMIN" || senderRole === "PROVIDER" ? senderRole : "PATIENT",
    sender_name: toOptionalString(row.sender_name) || null,
    message_type: inferMessageType(fileUrl),
    content: toOptionalString(row.content) || null,
    file_url: fileUrl,
    file_name: deriveFileName(fileUrl),
    file_size: null,
    is_read: Boolean(row.is_read),
    created_at: toStringValue(row.created_at),
  };
}

function unwrapCaseMutationPayload(payload: CaseMutationEnvelope): CaseMutationPayload {
  if (payload?.data && typeof payload.data === "object") {
    return payload.data;
  }

  return payload;
}

function unwrapCasePayload<T>(payload: T | { data?: T }): T {
  if (
    payload
    && typeof payload === "object"
    && "data" in payload
    && payload.data
    && typeof payload.data === "object"
  ) {
    return payload.data as T;
  }

  return payload as T;
}

async function getCaseById(id: string) {
  const response = await apiClient.get<CaseDetailEnvelope>(`/cases/${id}`);
  return { data: normalizePatientCase(unwrapCasePayload(response.data)) };
}

async function listCases(params?: { page?: number; limit?: number; status?: string }) {
  const response = await apiClient.get<CaseListEnvelope>(
    "/cases", { params }
  );
  const payload = unwrapCasePayload<CaseListResponse>(response.data);

  const rawCases = Array.isArray(payload?.cases)
    ? payload.cases
    : [];
  const page = Number(payload?.page ?? params?.page ?? 1);
  const limit = Number(payload?.limit ?? params?.limit ?? 20);
  const total = Number(payload?.total ?? rawCases.length);

  const cases = rawCases.map((c) => normalizePatientCase(c));

  const filteredCases = params?.status
    ? cases.filter((item) => item.status === params.status)
    : cases;

  return {
    data: {
      data: filteredCases,
      pagination: buildPagination(
        params?.status ? filteredCases.length : total,
        page,
        limit
      ),
    } satisfies ApiListResponse<PatientCase>,
  };
}

async function createCase(payload: CreateCasePayload) {
  const response = await apiClient.post<CaseMutationEnvelope>("/cases", payload);
  const result = unwrapCaseMutationPayload(response.data);

  return {
    data: {
      ...result,
      case: normalizePatientCase({
        case: result.case,
        services: result.services || [],
        appointments: result.appointments || [],
      }),
    },
  };
}

async function createPublicCase(payload: CreateGuestCasePayload) {
  const response = await publicApiClient.post<CaseMutationEnvelope>("/cases/public", payload);
  const result = unwrapCaseMutationPayload(response.data);

  return {
    data: {
      ...result,
      case: normalizePatientCase({
        case: result.case,
        services: result.services || [],
        appointments: result.appointments || [],
      }),
    },
  };
}

async function getCaseReport(id: string) {
  const response = await apiClient.get(`/cases/${id}/report`);
  return { data: normalizeReport(response.data) };
}

async function getCaseChatRooms(id: string) {
  const response = await apiClient.get<{ data?: unknown[] }>(`/cases/${id}/chat-rooms`);
  const rooms = Array.isArray(response.data?.data) ? response.data.data.map(normalizeChatRoom) : [];
  return { data: { data: rooms } };
}

async function getCaseChatMessages(roomId: string, params?: { limit?: number }) {
  const response = await apiClient.get<{ data?: unknown[] }>(`/cases/chat/rooms/${roomId}/messages`, { params });
  const messages = Array.isArray(response.data?.data) ? response.data.data.map(normalizeChatMessage) : [];

  return {
    data: {
      data: messages,
      pagination: buildPagination(messages.length, 1, Number(params?.limit ?? (messages.length || 50))),
    },
  };
}

async function getUnreadChatCount() {
  return apiClient.get<{ unread_count?: number }>("/cases/chat/unread-count");
}

function resolveMediaUrl(filePath: string | null | undefined) {
  if (!filePath) return null;
  if (filePath.startsWith("http") || filePath.startsWith("/uploads/")) return filePath;
  if (filePath.startsWith("uploads/")) return `/${filePath}`;
  return filePath;
}

function downloadReportPdf(id: string) {
  return apiClient.get<Blob>(`/cases/${id}/report/download`, { responseType: "blob" });
}

async function getCaseInvoice(id: string) {
  const response = await apiClient.get<PatientCaseInvoiceDetail | { data?: PatientCaseInvoiceDetail }>(`/cases/${id}/invoice`);
  return { data: normalizeCaseInvoiceDetail(unwrapCasePayload(response.data)) };
}

function downloadInvoicePdf(id: string) {
  return apiClient.get<Blob>(`/cases/${id}/invoice/pdf`, { responseType: "blob" });
}

export const casesApi = {
  list: listCases,
  getById: getCaseById,
  create: createCase,
  createPublic: createPublicCase,
  getReport: getCaseReport,
  getInvoice: getCaseInvoice,
  getChatRooms: getCaseChatRooms,
  getChatMessages: getCaseChatMessages,
  getUnreadChatCount,
  resolveMediaUrl,
  downloadReportPdf,
  downloadInvoicePdf,
};

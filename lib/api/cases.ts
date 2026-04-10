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
}

export interface PatientCaseService {
  id: string;
  case_id: string;
  service_id: string;
  service_name: string;
  service_description?: string;
  provider_id?: string;
  provider_name?: string;
  original_price: number;
  bundle_price: number;
  status: string;
  notes?: string;
  completed_at?: string;
  created_at: string;
  updated_at?: string;
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

  return {
    id: toStringValue(row.id),
    case_id: toStringValue(row.case_id),
    service_id: toStringValue(row.service_id),
    service_name: toStringValue(row.service_name),
    service_description: toOptionalString(row.service_description),
    provider_id: toOptionalString(row.provider_id),
    provider_name: toOptionalString(row.provider_name),
    original_price: toNumberValue(row.original_price),
    bundle_price: toNumberValue(row.bundle_price),
    status: toStringValue(row.status, "PENDING"),
    notes: toOptionalString(row.notes),
    completed_at: toOptionalString(row.completed_at),
    created_at: toStringValue(row.created_at),
    updated_at: toOptionalString(row.updated_at),
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

async function getCaseById(id: string) {
  const response = await apiClient.get<CaseDetailResponse | PatientCase>(`/cases/${id}`);
  return { data: normalizePatientCase(response.data) };
}

async function listCases(params?: { page?: number; limit?: number; status?: string }) {
  const response = await apiClient.get<CaseListResponse>("/cases", { params });
  const rawCases = Array.isArray(response.data?.cases) ? response.data.cases : [];
  const page = Number(response.data?.page ?? params?.page ?? 1);
  const limit = Number(response.data?.limit ?? params?.limit ?? 20);
  const total = Number(response.data?.total ?? rawCases.length);

  const enrichedCases = await Promise.all(
    rawCases.map(async (caseRow) => {
      const caseId = caseRow && typeof caseRow === "object" ? toStringValue((caseRow as Record<string, unknown>).id) : "";
      if (!caseId) {
        return normalizePatientCase(caseRow);
      }

      try {
        const detail = await getCaseById(caseId);
        return detail.data;
      } catch {
        return normalizePatientCase(caseRow);
      }
    }),
  );

  const filteredCases = params?.status
    ? enrichedCases.filter((item) => item.status === params.status)
    : enrichedCases;

  return {
    data: {
      data: filteredCases,
      pagination: buildPagination(params?.status ? filteredCases.length : total, page, limit),
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

function resolveMediaUrl(filePath: string | null | undefined) {
  if (!filePath) return null;
  if (filePath.startsWith("http") || filePath.startsWith("/uploads/")) return filePath;
  if (filePath.startsWith("uploads/")) return `/${filePath}`;
  return filePath;
}

function downloadReportPdf(id: string) {
  return apiClient.get<Blob>(`/cases/${id}/report/download`, { responseType: "blob" });
}

export const casesApi = {
  list: listCases,
  getById: getCaseById,
  create: createCase,
  createPublic: createPublicCase,
  getReport: getCaseReport,
  getChatRooms: getCaseChatRooms,
  getChatMessages: getCaseChatMessages,
  resolveMediaUrl,
  downloadReportPdf,
};

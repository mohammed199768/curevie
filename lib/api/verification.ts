import { isAxiosError } from "axios";
import { apiClient, publicApiClient } from "./client";
import type { VerificationRules } from "./settings";
import { getApiError } from "@/lib/utils/apiError";

/** GET /verification/status: what ordering requires and what this patient already did (once per account). */
export interface VerificationStatus extends VerificationRules {
  phone: string | null;
  phone_verified: boolean;
  id_document_uploaded: boolean;
  id_document_uploaded_at: string | null;
}

export type VerificationPart = "id_document" | "phone";

/** Seconds before "resend code" is offered again. */
export const RESEND_CODE_SECONDS = 60;
export const VERIFICATION_STATUS_QUERY_KEY = ["verification", "status"] as const;

/** Jordanian mobile numbers only: 07XXXXXXXX (also accepted with +962 / 00962). */
export function isJordanianMobile(phone: string | null | undefined) {
  const digits = String(phone || "").replace(/[^\d]/g, "");
  return /^(?:00962|962|0)?7\d{8}$/.test(digits);
}

function idDocumentForm(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
}

export const verificationApi = {
  getStatus: async () => (await apiClient.get<{ data: VerificationStatus }>("/verification/status")).data.data,

  /** Logged-in patient: the ID is saved on the account (asked once). */
  uploadIdDocument: async (file: File) =>
    (
      await apiClient.post<{ data: { uploaded_at: string } }>("/verification/id-document", idDocumentForm(file), {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60_000,
      })
    ).data.data,

  /** Guest: the upload returns a token that is sent with the order (valid for one order, 24 h). */
  uploadGuestIdDocument: async (file: File) =>
    (
      await publicApiClient.post<{ data: { id_document_token: string; expires_at: string } }>(
        "/verification/id-document",
        idDocumentForm(file),
        { headers: { "Content-Type": "multipart/form-data" }, timeout: 60_000 },
      )
    ).data.data,

  /** Sends a 6-digit code to the phone. `guest` picks the anonymous client. */
  requestPhoneCode: async (phone: string, guest = false) =>
    (
      await (guest ? publicApiClient : apiClient).post<{ data: { expires_in: number; channel: string } }>(
        "/verification/phone/request",
        { phone },
        { timeout: 20_000 },
      )
    ).data.data,

  confirmPhoneCode: async (phone: string, code: string, guest = false) =>
    (
      await (guest ? publicApiClient : apiClient).post<{
        data: { verification_token: string; expires_in: number; account_verified: boolean };
      }>("/verification/phone/confirm", { phone, code }, { timeout: 20_000 })
    ).data.data,
};

/** What is still missing for this patient, in the order it is asked. */
export function getMissingVerification(status: VerificationStatus | null | undefined): VerificationPart[] {
  if (!status) return [];
  const missing: VerificationPart[] = [];
  if (status.require_id && !status.id_document_uploaded) missing.push("id_document");
  if (status.require_phone && !status.phone_verified) missing.push("phone");
  return missing;
}

/**
 * Parts named by a 403 VERIFICATION_REQUIRED (details.missing) or a 400 ID_DOCUMENT_EXPIRED answer;
 * null when the error is about something else.
 */
export function getVerificationRequired(error: unknown): VerificationPart[] | null {
  if (!isAxiosError(error)) return null;
  const data = error.response?.data as { code?: string; details?: { missing?: unknown } } | undefined;
  if (data?.code !== "VERIFICATION_REQUIRED" && data?.code !== "ID_DOCUMENT_EXPIRED") return null;
  const missing = Array.isArray(data.details?.missing)
    ? data.details.missing.filter((part): part is VerificationPart => part === "id_document" || part === "phone")
    : [];
  if (missing.length) return missing;
  return data.code === "ID_DOCUMENT_EXPIRED" ? ["id_document"] : ["id_document", "phone"];
}

const KNOWN_VERIFICATION_ERROR_CODES = new Set([
  "VERIFICATION_REQUIRED",
  "INVALID_PHONE",
  "INVALID_CODE",
  "CODE_EXPIRED",
  "TOO_MANY_CODES",
  "TOO_MANY_ATTEMPTS",
  "CODE_NOT_SENT",
  "ID_DOCUMENT_EXPIRED",
  "INVALID_FILE_TYPE",
  "INVALID_FILE_CONTENTS",
  "NO_FILE",
]);

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Friendly message for a verification error. `t` must be bound to the "verification" namespace. */
export function getVerificationErrorMessage(error: unknown, t: Translate) {
  const { code } = getApiError(error);
  if (KNOWN_VERIFICATION_ERROR_CODES.has(code)) return t(`errors.${code}`);
  if (isAxiosError(error) && error.response?.status === 413) return t("errors.FILE_TOO_LARGE");
  if (isAxiosError(error) && error.response?.status === 429) return t("errors.RATE_LIMITED");
  return t("errors.GENERIC");
}

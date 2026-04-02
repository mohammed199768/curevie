"use client"; // FIX: F12 — keep the shared error helper safe for client-side auth and form flows.

export type ApiErrorCode = // FIX: F12 — enumerate the backend error codes the patient app handles explicitly.
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "TOKEN_EXPIRED"
  | "TOKEN_REVOKED"
  | "TOKEN_REUSE_DETECTED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INVALID_FILE_TYPE"
  | "INVALID_FILE_CONTENTS"
  | "INVALID_STATUS_TRANSITION"
  | "EMAIL_EXISTS"
  | "INVALID_CURRENT_PASSWORD"; // FIX: F12 — include the password-change code returned by the backend.

export interface ApiError { // FIX: F12 — standardize the parsed backend error shape across patient flows.
  code: ApiErrorCode | string;
  error: string;
  details?: Record<string, string[]>;
}

export function getApiError(err: unknown): ApiError { // FIX: F12 — centralize extraction of backend error payloads from axios errors.
  const response = (err as { response?: { data?: { code?: string; error?: string; message?: string; details?: Record<string, string[]> } } })?.response; // FIX: F12 — read the backend payload without scattering unsafe casts through components.
  const data = response?.data; // FIX: F12 — normalize the axios response payload before mapping fields.
  return { // FIX: F12 — expose a stable app-level error object for toast and form handlers.
    code: data?.code ?? "UNKNOWN_ERROR",
    error: data?.error ?? data?.message ?? "An unexpected error occurred",
    details: data?.details,
  };
}

export function getValidationErrors(err: unknown): Record<string, string> { // FIX: F12 — convert backend validation arrays into field-to-message pairs.
  const apiError = getApiError(err); // FIX: F12 — reuse the shared parser so validation handling matches toast handling.
  if (apiError.code !== "VALIDATION_ERROR" || !apiError.details) return {}; // FIX: F12 — ignore non-validation responses when mapping field errors.
  return Object.fromEntries( // FIX: F12 — flatten the backend detail arrays into react-hook-form friendly messages.
    Object.entries(apiError.details).map(([field, messages]) => [field, messages[0] ?? "Invalid value"]),
  );
}

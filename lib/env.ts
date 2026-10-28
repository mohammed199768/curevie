const DEVELOPMENT_API_URL = "http://localhost:5000/api/v1";

function resolveApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. Set it to the backend API base URL (for example https://api.curevie.net/api/v1) before building or running the patient site in production.",
    );
  }

  return DEVELOPMENT_API_URL;
}

function resolveApiOrigin(apiBaseUrl: string): string {
  try {
    return new URL(apiBaseUrl).origin;
  } catch {
    return apiBaseUrl.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "");
  }
}

/** Backend REST base URL, e.g. https://api.curevie.net/api/v1 */
export const API_BASE_URL = resolveApiBaseUrl();

/** Backend origin used by socket.io (served at /socket.io on the API host). */
export const API_ORIGIN = resolveApiOrigin(API_BASE_URL);

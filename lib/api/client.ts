import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_BASE_URL } from "@/lib/env";
import { useAuthStore } from "@/lib/stores/auth.store";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Do not try to refresh the session (and never redirect to login) when this request gets a 401. */
    skipAuthRefresh?: boolean;
  }
}

export const AUTH_ROLE = "PATIENT";

const AUTH_HANDSHAKE_PATHS = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"];

let refreshPromise: Promise<string> | null = null;
let isRedirectingToLogin = false;

interface RetryAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface RefreshResponse {
  access_token: string;
}

function logApiError(error: AxiosError) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.error("API ERROR:", error.response?.data || error.message);
}

function getCurrentLocale() {
  if (typeof window === "undefined") {
    return "en";
  }

  const firstSegment = window.location.pathname.split("/").filter(Boolean)[0];
  return firstSegment === "ar" || firstSegment === "en" ? firstSegment : "en";
}

/** Clears the in-memory session and sends the patient to the login page (once). */
export function handleSessionExpired() {
  if (typeof window === "undefined") {
    return;
  }

  useAuthStore.getState().logout();

  if (isRedirectingToLogin) {
    return;
  }

  const locale = getCurrentLocale();
  const loginPath = `/${locale}/login`;
  if (window.location.pathname.startsWith(loginPath)) {
    return;
  }

  isRedirectingToLogin = true;
  const redirect = `${window.location.pathname}${window.location.search}`;
  window.location.href = `${loginPath}?redirect=${encodeURIComponent(redirect)}`;
}

/**
 * Exchanges the httpOnly refresh cookie for a new access token. Concurrent callers share one request
 * (single flight) because the backend rotates the refresh token on every call.
 */
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<RefreshResponse>(
        `${API_BASE_URL}/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers: { "X-Auth-Role": AUTH_ROLE },
          timeout: 20_000,
        },
      )
      .then(({ data }) => {
        const nextToken = data.access_token;
        useAuthStore.getState().setAccessToken(nextToken);
        return nextToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function buildClient(timeout = 20_000) {
  return axios.create({
    baseURL: API_BASE_URL,
    timeout,
    headers: { "Content-Type": "application/json" },
    withCredentials: true,
  });
}

function normalizeParams(config: InternalAxiosRequestConfig) {
  const params = config.params;

  if (params && typeof params === "object" && !Array.isArray(params)) {
    const entries = Object.entries(params).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string" && value.trim() === "") return false;
      return true;
    });
    config.params = Object.fromEntries(entries);
  }

  return config;
}

function isAuthHandshakeRequest(url?: string) {
  const requestUrl = String(url || "");
  return AUTH_HANDSHAKE_PATHS.some((path) => requestUrl.includes(path));
}

/** Authenticated client: attaches the in-memory access token and refreshes it once on 401. */
export const apiClient = buildClient();
/** Anonymous client for public catalog, guest ordering and tracking. Never sends the access token. */
export const publicApiClient = buildClient(3_500);

publicApiClient.interceptors.request.use((config) => normalizeParams(config));

apiClient.interceptors.request.use((config) => {
  const normalizedConfig = normalizeParams(config);
  const token = useAuthStore.getState().accessToken;

  if (token && !normalizedConfig.headers.Authorization) {
    normalizedConfig.headers.Authorization = `Bearer ${token}`;
  }

  if (isAuthHandshakeRequest(normalizedConfig.url)) {
    normalizedConfig.headers["X-Auth-Role"] = AUTH_ROLE;
  }

  return normalizedConfig;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryAxiosRequestConfig | undefined;

    if (
      typeof window === "undefined"
      || error.response?.status !== 401
      || !original
      || original.skipAuthRefresh
      || isAuthHandshakeRequest(original.url)
    ) {
      logApiError(error);
      return Promise.reject(error);
    }

    if (original._retry) {
      logApiError(error);
      handleSessionExpired();
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      const nextToken = await refreshAccessToken();
      original.headers.Authorization = `Bearer ${nextToken}`;
      return apiClient(original);
    } catch (refreshError) {
      handleSessionExpired();
      return Promise.reject(refreshError);
    }
  },
);

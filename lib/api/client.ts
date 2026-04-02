import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "../stores/auth.store"; // FIX: F14 â€” sync refreshed access tokens back into the patient auth store.

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";
const AUTH_ROLE = "PATIENT";
let refreshPromise: Promise<string> | null = null;
let isRedirectingToLogin = false;

interface RetryAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface RefreshResponse {
  access_token: string;
}

function getLoginPath() {
  if (typeof window === "undefined") {
    return "/en/login";
  }

  const segments = window.location.pathname.split("/").filter(Boolean);
  const locale = ["en", "ar"].includes(segments[0]) ? segments[0] : "en";
  return `/${locale}/login`;
}

function clearSessionAndRedirect() {
  if (typeof window === "undefined") {
    return;
  }

  useAuthStore.getState().logout();

  if (isRedirectingToLogin) {
    return;
  }

  isRedirectingToLogin = true;
  window.location.href = getLoginPath();
}

function buildClient() {
  return axios.create({
    baseURL: BASE_URL,
    timeout: 20_000,
    headers: { "Content-Type": "application/json" },
    withCredentials: true, // FIX: F14 â€” allow auth requests to receive and send the httpOnly refresh-token cookie.
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

export const apiClient = buildClient();
export const publicApiClient = buildClient();

publicApiClient.interceptors.request.use((config) => {
  return normalizeParams(config);
});

apiClient.interceptors.request.use((config) => {
  const normalizedConfig = normalizeParams(config);

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      normalizedConfig.headers.Authorization = `Bearer ${token}`;
    }
  }

  return normalizedConfig;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config;
    const requestUrl = String(original?.url || "");
    const isAuthHandshakeRequest =
      requestUrl.includes("/auth/login")
      || requestUrl.includes("/auth/register")
      || requestUrl.includes("/auth/refresh")
      || requestUrl.includes("/auth/logout");

    if (typeof window === "undefined") {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && original && !isAuthHandshakeRequest) {
      const retryConfig = original as RetryAxiosRequestConfig;
      if (retryConfig._retry) {
        console.error("API ERROR:", error.response?.data || error.message);
        return Promise.reject(error);
      }

      retryConfig._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post<RefreshResponse>(
              `${BASE_URL}/auth/refresh`,
              {},
              {
                withCredentials: true,
                headers: { "X-Auth-Role": AUTH_ROLE },
              },
            )
            .then(({ data }) => {
              const newAccessToken = data.access_token;
              localStorage.setItem("access_token", newAccessToken);
              localStorage.removeItem("refresh_token");
              useAuthStore.getState().setTokens(newAccessToken, null);
              return newAccessToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newAccessToken = await refreshPromise;
        retryConfig.headers = retryConfig.headers || {};
        retryConfig.headers.Authorization = `Bearer ${newAccessToken}`; // FIX: F14 â€” retry the failed request with the refreshed access token.

        return apiClient(retryConfig);
      } catch (refreshError) {
        clearSessionAndRedirect();
        return Promise.reject(refreshError);
      }
    }

    console.error("API ERROR:", error.response?.data || error.message);
    return Promise.reject(error);
  },
);

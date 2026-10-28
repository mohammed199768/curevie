import { authApi } from "@/lib/api/auth";
import { refreshAccessToken } from "@/lib/api/client";
import { toPatient, useAuthStore } from "@/lib/stores/auth.store";

/** Storage keys written by earlier builds that persisted the session in the browser. */
const LEGACY_STORAGE_KEYS = ["curevie-patient-auth", "access_token", "refresh_token"];

let restorePromise: Promise<void> | null = null;

function clearLegacyStorage() {
  try {
    LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage can be unavailable (private mode); nothing to clean up then.
  }
}

async function runRestore() {
  const store = useAuthStore.getState();

  if (store.isAuthenticated && store.accessToken) {
    store.setHydrated(true);
    return;
  }

  try {
    const accessToken = await refreshAccessToken();
    const { data: user } = await authApi.me(accessToken);

    if (user?.role !== "PATIENT") {
      throw new Error("Invalid role");
    }

    useAuthStore.getState().setAuth(toPatient(user), useAuthStore.getState().accessToken || accessToken);
  } catch {
    useAuthStore.getState().logout();
  } finally {
    useAuthStore.getState().setHydrated(true);
  }
}

/**
 * Restores the patient session on page load: POST /auth/refresh (httpOnly cookie) and then GET /auth/me.
 * Runs once per page load; later callers share the same promise.
 */
export function restoreSession() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (!restorePromise) {
    clearLegacyStorage();
    restorePromise = runRestore();
  }

  return restorePromise;
}

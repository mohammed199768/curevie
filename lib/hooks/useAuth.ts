"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authApi, RegisterPayload } from "@/lib/api/auth";
import { useAuthStore } from "@/lib/stores/auth.store";
import { getApiError } from "@/lib/utils/apiError"; // FIX: F12 — route patient auth failures through the shared backend error parser.

interface LoginPayload {
  email: string;
  password: string;
  redirectTo?: string;
}

export function useAuth() {
  const router = useRouter();
  const locale = useLocale();
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");

  const { setAuth, logout: logoutStore } = useAuthStore(); // FIX: F14 — stop reading refresh_token from the store because it now lives in an httpOnly cookie.

  const login = async ({ email, password, redirectTo }: LoginPayload) => {
    try {
      const response = await authApi.login(email, password);
      const payload = response.data;

      if (payload.user.role !== "PATIENT") {
        throw new Error("Invalid role");
      }

      setAuth(
        {
          id: payload.user.id,
          full_name: payload.user.full_name,
          email: payload.user.email,
          phone: payload.user.phone || "",
          address: payload.user.address || null,
          gender: payload.user.gender || null,
          date_of_birth: payload.user.date_of_birth || null,
          avatar_url: payload.user.avatar_url || null,
          points: Number(payload.user.total_points || 0),
          role: "PATIENT",
        },
        payload.access_token,
        null, // FIX: F14 — store only the access token because the refresh token is now cookie-backed.
      );

      router.replace(redirectTo || `/${locale}/dashboard`);
    } catch (error) {
      const { code, error: message } = getApiError(error); // FIX: F12 — inspect the backend error code before choosing the patient login message.
      if (code === "RATE_LIMITED") { // FIX: F12 — surface the backend rate-limit response instead of a generic login failure.
        toast.error("Too many attempts. Wait 15 minutes."); // FIX: F12 — tell the patient why the login request is temporarily blocked.
      } else { // FIX: F12 — keep login messaging specific to credential failures and other backend responses.
        toast.error(code === "INVALID_CREDENTIALS" ? tAuth("invalidCredentials") : message || tCommon("error")); // FIX: F12 — prefer translated credential messaging with a backend fallback for other errors.
      }
      throw error;
    }
  };

  const register = async (data: RegisterPayload & { redirectTo?: string }) => {
    try {
      const { redirectTo, ...registerPayload } = data;
      const response = await authApi.register(registerPayload);
      const authPayload = response.data;

      setAuth(
        {
          id: authPayload.user.id,
          full_name: authPayload.user.full_name,
          email: authPayload.user.email,
          phone: authPayload.user.phone || data.phone,
          address: authPayload.user.address || data.address || null,
          gender: authPayload.user.gender || data.gender || null,
          date_of_birth: authPayload.user.date_of_birth || data.date_of_birth || null,
          avatar_url: authPayload.user.avatar_url || null,
          points: Number(authPayload.user.total_points || 0),
          role: "PATIENT",
        },
        authPayload.access_token,
        null, // FIX: F14 — store only the access token because the refresh token is now cookie-backed.
      );

      router.replace(redirectTo || `/${locale}/dashboard`);
    } catch (error) {
      const { code, error: message } = getApiError(error); // FIX: F12 — inspect the backend error code before choosing the patient registration message.
      if (code === "EMAIL_EXISTS") { // FIX: F12 — tell the patient when the submitted email is already registered.
        toast.error("Email already registered"); // FIX: F12 — replace the generic registration failure with a concrete backend reason.
      } else if (code === "RATE_LIMITED") { // FIX: F12 — surface backend throttling on repeated registration attempts.
        toast.error("Too many attempts. Wait 15 minutes."); // FIX: F12 — explain why registration is temporarily blocked.
      } else if (code === "VALIDATION_ERROR") { // FIX: F12 — distinguish server-side validation failures from unknown registration failures.
        toast.error(tCommon("validationError")); // FIX: F12 — reuse the patient validation copy for malformed registration payloads.
      } else { // FIX: F12 — fall back to the backend-provided error text for unexpected registration failures.
        toast.error(message || tCommon("error")); // FIX: F12 — preserve a user-visible message even when no specific code mapping exists.
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout(); // FIX: F14 — let the backend clear the httpOnly refresh-token cookie without sending a JS-managed token body.
    } catch {
      toast.error(tCommon("error"));
    } finally {
      logoutStore();
      router.replace(`/${locale}/login`);
    }
  };

  return { login, register, logout };
}


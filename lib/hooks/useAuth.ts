"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { authApi, RegisterPayload } from "@/lib/api/auth";
import { toPatient, useAuthStore } from "@/lib/stores/auth.store";
import { getApiError } from "@/lib/utils/apiError";

interface LoginPayload {
  email: string;
  password: string;
  redirectTo?: string;
}

export function useAuth() {
  const router = useRouter();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const tAuth = useTranslations("auth");
  const tCommon = useTranslations("common");

  const setAuth = useAuthStore((state) => state.setAuth);
  const logoutStore = useAuthStore((state) => state.logout);

  const login = async ({ email, password, redirectTo }: LoginPayload) => {
    try {
      const response = await authApi.login(email, password);
      const payload = response.data;

      if (payload.user.role !== "PATIENT") {
        throw new Error("Invalid role");
      }

      setAuth(toPatient(payload.user), payload.access_token);
      router.replace(redirectTo || `/${locale}/dashboard`);
    } catch (error) {
      const { code, error: message } = getApiError(error);
      if (code === "RATE_LIMITED") {
        toast.error(tAuth("rateLimited"));
      } else {
        toast.error(code === "INVALID_CREDENTIALS" ? tAuth("invalidCredentials") : message || tCommon("error"));
      }
      throw error;
    }
  };

  const register = async (data: RegisterPayload & { redirectTo?: string }) => {
    try {
      const { redirectTo, ...registerPayload } = data;
      const response = await authApi.register(registerPayload);
      const authPayload = response.data;

      setAuth(toPatient(authPayload.user), authPayload.access_token);
      router.replace(redirectTo || `/${locale}/dashboard`);
    } catch (error) {
      const { code, error: message } = getApiError(error);
      if (code === "EMAIL_EXISTS") {
        toast.error(tAuth("emailExists"));
      } else if (code === "RATE_LIMITED") {
        toast.error(tAuth("rateLimited"));
      } else if (code === "VALIDATION_ERROR") {
        toast.error(tCommon("validationError"));
      } else {
        toast.error(message || tCommon("error"));
      }
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // The local session is cleared regardless; the cookie expires on its own.
    } finally {
      logoutStore();
      queryClient.clear();
      router.replace(`/${locale}/login`);
    }
  };

  return { login, register, logout };
}

"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { RealtimeProvider } from "@/components/providers/RealtimeProvider";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { casesApi } from "@/lib/api/cases";
import { notificationsApi } from "@/lib/api/notifications";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useUiStore } from "@/lib/stores/ui.store";
import { isTabBarHidden } from "@/components/layout/AppTabBar";
import { stripLocale } from "@/lib/app-routes";
import { cn } from "@/lib/utils";

// Socket events keep the counters live; this slow refetch is only a fallback.
const FALLBACK_REFETCH_INTERVAL_MS = 60_000;

function shouldRetryDashboardQuery(failureCount: number, error: unknown) {
  if (isAxiosError(error) && error.response?.status === 429) {
    return false;
  }

  return failureCount < 1;
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();

  const patient = useAuthStore((state) => state.patient);
  const accessToken = useAuthStore((state) => state.accessToken);
  const hydrated = useAuthStore((state) => state.hydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const setUnreadNotifications = useUiStore((state) => state.setUnreadNotifications);
  const setUnreadChat = useUiStore((state) => state.setUnreadChat);
  const sessionReady = hydrated && isAuthenticated && Boolean(accessToken) && patient?.role === "PATIENT";

  const notificationsQuery = useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const response = await notificationsApi.list({
        page: 1,
        limit: 1,
        unread_only: true,
      });
      return Number(response.data?.unread_count || 0);
    },
    refetchInterval: FALLBACK_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    retry: shouldRetryDashboardQuery,
    enabled: sessionReady,
  });

  const unreadChatQuery = useQuery({
    queryKey: ["chat", "unread"],
    queryFn: casesApi.getUnreadChatCount,
    refetchInterval: FALLBACK_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    retry: shouldRetryDashboardQuery,
    enabled: sessionReady,
  });

  useEffect(() => {
    setUnreadNotifications(Number(notificationsQuery.data || 0));
  }, [notificationsQuery.data, setUnreadNotifications]);

  useEffect(() => {
    setUnreadChat(Number(unreadChatQuery.data || 0));
  }, [setUnreadChat, unreadChatQuery.data]);

  useEffect(() => {
    if (!hydrated) return;

    if (!sessionReady) {
      const search = typeof window !== "undefined" ? window.location.search : "";
      router.replace(`/${locale}/login?redirect=${encodeURIComponent(`${pathname}${search}`)}`);
    }
  }, [hydrated, locale, pathname, router, sessionReady]);

  const tabBarHidden = isTabBarHidden(stripLocale(pathname, locale));

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-[var(--app-bg)]">
        <div className="mx-auto w-full max-w-3xl px-4 pt-6">
          <AppPreloader variant="page" title={tCommon("loading")} blockCount={3} className="w-full" />
        </div>
      </div>
    );
  }

  return (
    <RealtimeProvider enabled={sessionReady}>
      <div className="min-h-screen bg-[var(--app-bg)] text-[15px]">
        <div className={cn("fixed inset-y-0 z-40 hidden md:block", locale === "ar" ? "right-0" : "left-0")}>
          <DashboardSidebar locale={locale} />
        </div>

        <div className={cn("min-h-screen", locale === "ar" ? "md:pr-[260px]" : "md:pl-[260px]")}>
          <DashboardHeader />
          <main
            className={cn(
              "mx-auto w-full max-w-5xl px-4 pt-2 md:px-8 md:pb-12",
              tabBarHidden ? "pb-6" : "pb-[calc(env(safe-area-inset-bottom)+7.5rem)]",
            )}
          >
            {children}
          </main>
        </div>
        <MobileBottomNav variant="dashboard" />
      </div>
    </RealtimeProvider>
  );
}

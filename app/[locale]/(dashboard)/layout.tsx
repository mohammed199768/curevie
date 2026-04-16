"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { ChatFloatingButton } from "@/components/shared/ChatFloatingButton";
import { casesApi } from "@/lib/api/cases";
import { notificationsApi } from "@/lib/api/notifications";
import { connectAppSocket, type AppSocket } from "@/lib/socket-client";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useUiStore } from "@/lib/stores/ui.store";
import { cn } from "@/lib/utils";

const NOTIFICATIONS_REFETCH_INTERVAL_MS = 60_000;
const UNREAD_CHAT_REFETCH_INTERVAL_MS = 60_000;

type NotificationUnreadPayload = {
  unread_count?: number;
};

type ChatUnreadPayload = {
  unread_count?: number;
};

function shouldRetryDashboardQuery(failureCount: number, error: unknown) {
  if (isAxiosError(error) && error.response?.status === 429) {
    return false;
  }

  return failureCount < 1;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const isChatRoute = pathname.endsWith("/chat");
  const queryClient = useQueryClient();
  const socketRef = useRef<AppSocket | null>(null);

  const patient = useAuthStore((state) => state.patient);
  const accessToken = useAuthStore((state) => state.accessToken);
  const hydrated = useAuthStore((state) => state.hydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logoutStore = useAuthStore((state) => state.logout);

  const setUnreadNotifications = useUiStore((state) => state.setUnreadNotifications);
  const setUnreadChat = useUiStore((state) => state.setUnreadChat);

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
    refetchInterval: NOTIFICATIONS_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    retry: shouldRetryDashboardQuery,
    enabled: hydrated && isAuthenticated && Boolean(accessToken),
  });

  const unreadChatQuery = useQuery({
    queryKey: ["chat", "unread-chat-total"],
    queryFn: async () => {
      const response = await casesApi.getUnreadChatCount();
      return Number(response.data?.unread_count || 0);
    },
    refetchInterval: isChatRoute ? false : UNREAD_CHAT_REFETCH_INTERVAL_MS,
    refetchIntervalInBackground: false,
    retry: shouldRetryDashboardQuery,
    enabled: hydrated && isAuthenticated && Boolean(accessToken),
  });

  useEffect(() => {
    setUnreadNotifications(Number(notificationsQuery.data || 0));
  }, [notificationsQuery.data, setUnreadNotifications]);

  useEffect(() => {
    setUnreadChat(Number(unreadChatQuery.data || 0));
  }, [setUnreadChat, unreadChatQuery.data]);

  useEffect(() => {
    if (notificationsQuery.error || unreadChatQuery.error) {
      toast.error(tCommon("error"));
    }
  }, [notificationsQuery.error, tCommon, unreadChatQuery.error]);

  useEffect(() => {
    if (!hydrated) return;

    if (!isAuthenticated || !accessToken || patient?.role !== "PATIENT") {
      logoutStore();
      router.replace(`/${locale}/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [
    accessToken,
    hydrated,
    isAuthenticated,
    locale,
    logoutStore,
    pathname,
    patient?.role,
    router,
  ]);

  useEffect(() => {
    if (!hydrated || !isAuthenticated || !accessToken || patient?.role !== "PATIENT") {
      return undefined;
    }

    let disposed = false;
    let currentSocket: AppSocket | null = null;

    void connectAppSocket(accessToken).then((socket) => {
      if (!socket) return;

      if (disposed) {
        socket.disconnect();
        return;
      }

      currentSocket = socket;
      socketRef.current = socket;

      socket.on("notification_unread_updated", (payload: unknown) => {
        const typedPayload = payload as NotificationUnreadPayload | undefined;
        const unreadCount = Number(typedPayload?.unread_count || 0);

        queryClient.setQueryData(["notifications", "unread-count"], unreadCount);
        setUnreadNotifications(unreadCount);
        void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      });

      socket.on("chat_unread_updated", (payload: unknown) => {
        const typedPayload = payload as ChatUnreadPayload | undefined;
        const unreadCount = Number(typedPayload?.unread_count || 0);

        queryClient.setQueryData(["chat", "unread-chat-total"], unreadCount);
        setUnreadChat(unreadCount);
        void queryClient.invalidateQueries({ queryKey: ["chat", "unread-chat-total"] });
        void queryClient.invalidateQueries({
          queryKey: ["patient-chat", "case-room-metadata"],
        });
      });
    });

    return () => {
      disposed = true;
      currentSocket?.disconnect();
      socketRef.current = null;
    };
  }, [
    accessToken,
    hydrated,
    isAuthenticated,
    patient?.role,
    queryClient,
    setUnreadChat,
    setUnreadNotifications,
  ]);

  if (!hydrated || !isAuthenticated || !accessToken || patient?.role !== "PATIENT") {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-6 sm:px-6">
        <AppPreloader
          variant="page"
          title={tCommon("loading")}
          blockCount={4}
          className="w-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950/30">
      <div
        className={cn(
          "fixed inset-y-0 z-40 hidden md:block",
          locale === "ar" ? "right-0" : "left-0"
        )}
      >
        <DashboardSidebar locale={locale} />
      </div>

      <div
        className={cn(
          "min-h-screen pb-16 md:pb-0",
          locale === "ar" ? "md:pr-[240px]" : "md:pl-[240px]"
        )}
      >
        <DashboardHeader />
        <main className="p-4 md:p-6">{children}</main>
      </div>
      <MobileBottomNav variant="dashboard" />
      <ChatFloatingButton />
    </div>
  );
}

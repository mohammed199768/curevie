"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { AppPreloader } from "@/components/shared/AppPreloader";
import { ChatFloatingButton } from "@/components/shared/ChatFloatingButton";
import { chatApi } from "@/lib/api/chat";
import { notificationsApi } from "@/lib/api/notifications";
import { requestsApi } from "@/lib/api/requests";
import type { RequestChatMessage, RequestItem } from "@/lib/api/types";
import { usePolling } from "@/lib/hooks/usePolling";
import { readRequestChatLastSeenMap } from "@/lib/request-chat-read-state";
import { useAuthStore } from "@/lib/stores/auth.store";
import { useUiStore } from "@/lib/stores/ui.store";
import { cn, normalizeListResponse } from "@/lib/utils";

type NotificationUnreadResponse = {
  unread_count?: number;
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const tCommon = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();

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
      const response = await notificationsApi.list({ page: 1, limit: 1, unread_only: true });
      const data = response.data as NotificationUnreadResponse | null | undefined;
      const count = typeof data?.unread_count === "number" ? data.unread_count : 0;
      return Number(count);
    },
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    enabled: hydrated && isAuthenticated && Boolean(accessToken),
  });

  const unreadChatQuery = useQuery({
    queryKey: ["chat", "unread-chat-total"],
    queryFn: async () => {
      const adminResp = await chatApi.getConversations();
      const adminUnread = (adminResp.data.data || []).reduce(
        (sum, row) => sum + Number(row.unread_count || 0),
        0,
      );

      const seenMap = readRequestChatLastSeenMap();
      let requestUnread = 0;

      try {
        const requestsResp = await requestsApi.list({ page: 1, limit: 100 });
        const allRequests = normalizeListResponse<RequestItem>(requestsResp.data).data;
        const roomStatuses = new Set(["IN_PROGRESS", "COMPLETED", "CLOSED"]);
        const rooms = allRequests.filter(
          (request) => roomStatuses.has(request.status) && (request.provider_name || request.assigned_provider_id),
        );

        await Promise.all(
          rooms.map(async (request) => {
            try {
              const msgResp = await requestsApi.listChatMessages(request.id, "PROVIDER_PATIENT", { page: 1, limit: 5 });
              const rawMessages = msgResp.data.data;
              const messages: RequestChatMessage[] = Array.isArray(rawMessages) ? rawMessages : [];
              const lastExternal = [...messages].reverse().find((message) => message.sender_role !== "PATIENT");

              if (lastExternal?.created_at) {
                const seenAt = seenMap[request.id];
                if (!seenAt || new Date(lastExternal.created_at) > new Date(seenAt)) {
                  requestUnread += 1;
                }
              }
            } catch {
              // Skip this room on error.
            }
          }),
        );
      } catch {
        // Skip request rooms on error.
      }

      return adminUnread + requestUnread;
    },
    enabled: hydrated && isAuthenticated && Boolean(accessToken),
  });

  usePolling(
    () => {
      void unreadChatQuery.refetch();
    },
    10_000,
    hydrated && isAuthenticated && Boolean(accessToken),
  );

  useEffect(() => {
    setUnreadNotifications(Number(notificationsQuery.data || 0));
  }, [notificationsQuery.data, setUnreadNotifications]);

  useEffect(() => {
    const count = Number(unreadChatQuery.data || 0);
    setUnreadChat(count);
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
  }, [accessToken, hydrated, isAuthenticated, locale, logoutStore, pathname, patient?.role, router]);

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
      <div className={cn("fixed inset-y-0 z-40 hidden md:block", locale === "ar" ? "right-0" : "left-0")}>
        <DashboardSidebar locale={locale} />
      </div>

      <div className={cn("min-h-screen pb-16 md:pb-0", locale === "ar" ? "md:pr-[240px]" : "md:pl-[240px]")}>
        <DashboardHeader />
        <main className="p-4 md:p-6">{children}</main>
      </div>
      <MobileBottomNav variant="dashboard" />
      <ChatFloatingButton />
    </div>
  );
}


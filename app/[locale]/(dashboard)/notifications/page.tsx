"use client";

import {
  Activity,
  Bell,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  Megaphone,
  Star,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { notificationsApi } from "@/lib/api/notifications";
import type { ApiListResponse, NotificationItem } from "@/lib/api/types";
import { translateNotificationContent } from "@/lib/i18n";
import { getPatientNotificationHref } from "@/lib/notification-routing";
import { cn } from "@/lib/utils";

const LIMIT = 20;

type NotificationsResponse = ApiListResponse<NotificationItem>;

function getIcon(type: string) {
  if (type.startsWith("REQUEST") || type.startsWith("CASE")) {
    return <Activity className="h-5 w-5 text-blue-500" />;
  }
  if (type.startsWith("PAYMENT") || type.startsWith("INVOICE")) {
    return <CreditCard className="h-5 w-5 text-green-500" />;
  }
  if (type.startsWith("REPORT")) {
    return <FileText className="h-5 w-5 text-purple-500" />;
  }
  if (type.startsWith("POINTS")) {
    return <Star className="h-5 w-5 text-yellow-500" />;
  }
  return <Megaphone className="h-5 w-5 text-muted-foreground" />;
}

function groupByDate(
  items: NotificationItem[],
  labels: { today: string; yesterday: string; earlier: string }
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: { label: string; items: NotificationItem[] }[] = [];
  const groupedItems: Record<string, NotificationItem[]> = {};

  for (const item of items) {
    const itemDate = new Date(item.created_at);
    itemDate.setHours(0, 0, 0, 0);

    let label = labels.earlier;
    if (itemDate.getTime() === today.getTime()) {
      label = labels.today;
    } else if (itemDate.getTime() === yesterday.getTime()) {
      label = labels.yesterday;
    }

    if (!groupedItems[label]) {
      groupedItems[label] = [];
      groups.push({ label, items: groupedItems[label] });
    }

    groupedItems[label].push(item);
  }

  return groups;
}

function NotificationSkeleton() {
  return (
    <div className="flex gap-3 border-b px-4 py-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const locale = useLocale();
  const t = useTranslations("notificationsPage");
  const tEnums = useTranslations("enums");
  const router = useRouter();
  const queryClient = useQueryClient();
  const isRtl = locale === "ar";
  const dateFnsLocale = locale === "ar" ? ar : enUS;

  const [tab, setTab] = useState<"all" | "unread">("all");
  const [page, setPage] = useState(1);

  const queryKey = ["notifications", tab, page];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () =>
      (await notificationsApi.list({
        page,
        limit: LIMIT,
        unread_only: tab === "unread",
      })).data as NotificationsResponse,
    staleTime: 30_000,
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.setQueryData(["notifications", "unread-count"], 0);
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationsResponse>(queryKey);
      const previousUnreadCount =
        queryClient.getQueryData<number>(["notifications", "unread-count"]) ?? unreadCount;

      queryClient.setQueryData<NotificationsResponse | undefined>(queryKey, (current) => {
        if (!current?.data) return current;

        return {
          ...current,
          unread_count: Math.max(0, Number(current.unread_count || 0) - 1),
          data: current.data.map((notification) =>
            notification.id === id
              ? { ...notification, is_read: true }
              : notification
          ),
        };
      });

      const targetNotification = previous?.data?.find(
        (notification) => notification.id === id
      );

      if (targetNotification && !targetNotification.is_read) {
        queryClient.setQueryData(
          ["notifications", "unread-count"],
          Math.max(0, Number(previousUnreadCount || 0) - 1)
        );
      }

      return { previous, previousUnreadCount };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }

      queryClient.setQueryData(
        ["notifications", "unread-count"],
        Number(context?.previousUnreadCount || 0)
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = data?.data ?? [];
  const totalPages = data?.pagination?.total_pages ?? data?.pagination?.pages ?? 1;
  const unreadCount = data?.unread_count ?? 0;
  const groups = groupByDate(notifications, {
    today: t("today"),
    yesterday: t("yesterday"),
    earlier: t("earlier"),
  });

  const handleClick = async (notification: NotificationItem) => {
    if (!notification.is_read) {
      try {
        await markReadMutation.mutateAsync(notification.id);
      } catch {
        // Allow navigation to the target case even if read-state sync fails.
      }
    }

    const href = getPatientNotificationHref(notification, locale);
    if (href) {
      router.push(href);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6" dir={isRtl ? "rtl" : "ltr"}>
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">{t("title")}</h1>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
              {unreadCount}
            </span>
          ) : null}
        </div>

        {unreadCount > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-primary"
            onClick={() => markAllMutation.mutate()}
            disabled={markAllMutation.isPending}
          >
            <CheckCheck className="me-1 h-3.5 w-3.5" />
            {t("markAllAsRead")}
          </Button>
        ) : null}
      </div>

      <div className="mb-4 w-fit rounded-lg bg-muted p-1">
        <div className="flex gap-1">
          {(["all", "unread"] as const).map((tabKey) => (
            <button
              key={tabKey}
              onClick={() => {
                setTab(tabKey);
                setPage(1);
              }}
              className={cn(
                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                tab === tabKey
                  ? "bg-background text-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t(tabKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-background">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <NotificationSkeleton key={index} />
          ))
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Bell className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {tab === "unread" ? t("emptyUnread") : t("empty")}
            </p>
          </div>
        ) : (
          groups.map(({ label, items }) => (
            <div key={label}>
              <div className="sticky top-0 z-10 bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground">
                {label}
              </div>

              {items.map((notification) => {
                const localized = translateNotificationContent(notification, t, tEnums);
                const title = localized.title || notification.title;
                const body = localized.body || notification.body;

                return (
                  <button
                    key={notification.id}
                    onClick={() => {
                      void handleClick(notification);
                    }}
                    className={cn(
                      "w-full border-b px-4 py-3.5 text-start transition-colors last:border-0 hover:bg-accent",
                      !notification.is_read && "bg-primary/5"
                    )}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                        {getIcon(notification.type)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            !notification.is_read
                              ? "font-semibold"
                              : "text-muted-foreground"
                          )}
                        >
                          {title}
                        </p>
                        {body && body !== title ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {body}
                          </p>
                        ) : null}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: dateFnsLocale,
                          })}
                        </p>
                      </div>

                      {!notification.is_read ? (
                        <div className="mt-2 shrink-0">
                          <span className="block h-2 w-2 rounded-full bg-primary" />
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
            disabled={page === 1}
          >
            {isRtl ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
            {t("previous")}
          </Button>

          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
            disabled={page >= totalPages}
          >
            {t("next")}
            {isRtl ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
